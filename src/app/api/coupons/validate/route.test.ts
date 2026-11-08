// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const postValidate = (body: unknown) =>
  POST(
    new Request("http://localhost/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/coupons/validate", () => {
  it("200 - trả về quy tắc mã và số tiền giảm cho giỏ hàng", async () => {
    const response = await postValidate({
      couponCode: "SHOPLITE10",
      items: [{ productId: "p010", quantity: 2 }],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      coupon: { code: "SHOPLITE10", type: "percent" },
      subtotal: 300_000,
      discount: 30_000,
    });
  });

  it("400 - body không phải JSON", async () => {
    const response = await postValidate("{oops");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Body phải là JSON hợp lệ" },
    });
  });
});

describe("POST /api/coupons/validate - mã không hợp lệ", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T10:00:00+07:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["KHONGCO", "p010", "COUPON_NOT_FOUND"],
    ["TET2026", "p010", "COUPON_EXPIRED"],
    ["GIAM50K", "p006", "COUPON_MIN_SUBTOTAL_NOT_MET"],
  ])("422 - %s → %s", async (couponCode, productId, code) => {
    const response = await postValidate({ couponCode, items: [{ productId, quantity: 1 }] });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe(code);
    expect(typeof body.error.message).toBe("string");
    expect(body.error.details).toEqual({ couponCode: body.error.message });
  });

  it("400 - mã chỉ có khoảng trắng, lỗi tại trường couponCode", async () => {
    const response = await postValidate({
      couponCode: "   ",
      items: [{ productId: "p010", quantity: 1 }],
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.couponCode).toBe("Vui lòng nhập mã giảm giá");
  });
});
