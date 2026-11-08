// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

// Thay orderService (ghi file) bằng bản dùng repository trong bộ nhớ.
vi.mock("@/features/orders/server", async () => {
  const { createOrderService } = await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } = await import("@/features/orders/order-repository");
  return { orderService: createOrderService({ repository: createInMemoryOrderRepository() }) };
});

const postOrder = (body: unknown) =>
  POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const validBody = {
  customer: { fullName: "Phạm Minh D", phone: "0356789012", address: "99 Hai Bà Trưng, Huế" },
  shippingMethod: "express",
  paymentMethod: "bank_transfer",
  items: [{ productId: "p006", quantity: 1 }],
};

describe("POST /api/orders", () => {
  it("201 - tạo đơn hàng thành công", async () => {
    const response = await postOrder(validBody);
    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order).toMatchObject({ status: "pending", subtotal: 450_000, shippingFee: 60_000 });
  });

  it("400 - body không phải JSON", async () => {
    const response = await postOrder("{oops");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("400 - dữ liệu không hợp lệ kèm details", async () => {
    const response = await postOrder({
      ...validBody,
      customer: { ...validBody.customer, phone: "1" },
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.details).toHaveProperty(["customer.phone"]);
  });

  it("409 - vượt quá tồn kho", async () => {
    const response = await postOrder({ ...validBody, items: [{ productId: "p004", quantity: 1 }] });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INSUFFICIENT_STOCK");
  });
});

describe("GET /api/orders", () => {
  it("trả về các đơn hàng đã tạo", async () => {
    const response = await GET();
    const { orders } = await response.json();
    expect(response.status).toBe(200);
    expect(orders.length).toBeGreaterThan(0);
  });
});

describe("POST /api/orders - mã giảm giá", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T10:00:00+07:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("422 - mã hết hạn, đúng định dạng lỗi và không tạo đơn mới", async () => {
    const before = (await (await GET()).json()).orders.length;

    const response = await postOrder({ ...validBody, couponCode: "TET2026" });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: {
        code: "COUPON_EXPIRED",
        message: "Mã giảm giá đã hết hạn",
        details: { couponCode: "Mã giảm giá đã hết hạn" },
      },
    });
    expect((await (await GET()).json()).orders.length).toBe(before);
  });

  it("201 - bỏ qua số tiền giảm client gửi lên", async () => {
    // p006 450.000đ → SHOPLITE10 giảm 45.000đ, giao nhanh 60.000đ
    const response = await postOrder({ ...validBody, couponCode: "shoplite10", discount: 999_999 });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      couponCode: "SHOPLITE10",
      subtotal: 450_000,
      discount: 45_000,
      shippingFee: 60_000,
      total: 465_000,
    });
  });
});
