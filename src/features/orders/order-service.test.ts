import { beforeEach, describe, expect, it, vi } from "vitest";
import { SHIPPING_OPTIONS } from "@/features/checkout/pricing";
import { formatCurrency } from "@/lib/format";
import { OrderError } from "./order-errors";
import { createInMemoryOrderRepository, type OrderRepository } from "./order-repository";
import { createOrderService, generateOrderId, type OrderService } from "./order-service";

const FIXED_DATE = new Date("2026-10-21T03:00:00.000Z");

const validInput = (overrides: Record<string, unknown> = {}) => ({
  customer: {
    fullName: "Trần Thị B",
    phone: "0987654321",
    email: "",
    address: "45 Lê Lợi, Hải Châu, Đà Nẵng",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p010", quantity: 2 }], // Cáp USB-C 150.000đ
  ...overrides,
});

async function expectOrderError(promise: Promise<unknown>, code: OrderError["code"]) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(OrderError);
  expect((error as OrderError).code).toBe(code);
  return error as OrderError;
}

describe("orderService", () => {
  let repository: OrderRepository;
  let service: OrderService;

  beforeEach(() => {
    repository = createInMemoryOrderRepository();
    let counter = 0;
    service = createOrderService({
      repository,
      now: () => FIXED_DATE,
      generateId: () => `SL-TEST-${++counter}`,
    });
  });

  describe("placeOrder", () => {
    it("tạo đơn hàng với giá lấy từ catalog và lưu vào repository", async () => {
      const order = await service.placeOrder(validInput());

      expect(order).toMatchObject({
        id: "SL-TEST-1",
        status: "pending",
        createdAt: FIXED_DATE.toISOString(),
        subtotal: 300_000,
        shippingFee: SHIPPING_OPTIONS.standard.fee,
        total: 330_000,
      });
      expect(order.items[0]).toMatchObject({
        productId: "p010",
        unitPrice: 150_000,
        lineTotal: 300_000,
      });
      expect(order.customer.email).toBeUndefined();
      expect(await repository.findById(order.id)).toEqual(order);
    });

    it("bỏ qua giá do client gửi lên", async () => {
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p010", quantity: 1, price: 1 }] }),
      );
      expect(order.items[0].unitPrice).toBe(150_000);
    });

    it("gộp các dòng trùng sản phẩm", async () => {
      const order = await service.placeOrder(
        validInput({
          items: [
            { productId: "p010", quantity: 1 },
            { productId: "p010", quantity: 2 },
          ],
        }),
      );
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(3);
    });

    it("miễn phí giao hàng tiêu chuẩn cho đơn từ 500.000đ", async () => {
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p001", quantity: 1 }] }),
      );
      expect(order.shippingFee).toBe(0);
    });

    it("trả lỗi VALIDATION_ERROR kèm chi tiết từng field", async () => {
      const error = await expectOrderError(
        service.placeOrder(validInput({ customer: { fullName: "", phone: "123", address: "" } })),
        "VALIDATION_ERROR",
      );
      expect(error.details).toHaveProperty(["customer.phone"]);
      expect(error.httpStatus).toBe(400);
    });

    it("từ chối giỏ hàng trống", async () => {
      await expectOrderError(service.placeOrder(validInput({ items: [] })), "VALIDATION_ERROR");
    });

    it("trả lỗi PRODUCT_NOT_FOUND khi sản phẩm không tồn tại", async () => {
      await expectOrderError(
        service.placeOrder(validInput({ items: [{ productId: "p999", quantity: 1 }] })),
        "PRODUCT_NOT_FOUND",
      );
    });

    describe("mã giảm giá", () => {
      it("áp dụng mã (chuẩn hóa chữ in hoa), lưu mã và số tiền giảm vào đơn", async () => {
        // Chuột SwiftClick (p006) 450.000đ + Cáp USB-C (p010) 150.000đ = 600.000đ
        const order = await service.placeOrder(
          validInput({
            couponCode: "giam50k",
            items: [
              { productId: "p006", quantity: 1 },
              { productId: "p010", quantity: 1 },
            ],
          }),
        );

        expect(order).toMatchObject({
          couponCode: "GIAM50K",
          subtotal: 600_000,
          discount: 50_000,
          shippingFee: 0,
          total: 550_000,
        });
        expect(await repository.findById(order.id)).toEqual(order);
      });

      it("miễn phí giao hàng xét theo tạm tính trước giảm giá", async () => {
        // Bàn di chuột (p007) 250.000đ x 2 = 500.000đ; SHOPLITE10 giảm 50.000đ còn 450.000đ
        const order = await service.placeOrder(
          validInput({ couponCode: "SHOPLITE10", items: [{ productId: "p007", quantity: 2 }] }),
        );

        expect(order).toMatchObject({ discount: 50_000, shippingFee: 0, total: 450_000 });
      });

      it("đơn không dùng mã có số tiền giảm bằng 0 và không có couponCode", async () => {
        const order = await service.placeOrder(validInput());

        expect(order.discount).toBe(0);
        expect(order).not.toHaveProperty("couponCode");
      });

      it("mã không tồn tại → COUPON_NOT_FOUND và không lưu đơn", async () => {
        const error = await expectOrderError(
          service.placeOrder(validInput({ couponCode: "KHONGCO" })),
          "COUPON_NOT_FOUND",
        );

        expect(error.details?.couponCode).toBe("Mã giảm giá không tồn tại");
        expect(await repository.findAll()).toEqual([]);
      });
    });

    describe("chống gian lận", () => {
      const serviceAt = (date: Date) =>
        createOrderService({ repository, now: () => date, generateId: () => "SL-TEST-TIME" });

      it("bỏ qua mọi số tiền client gửi lên, chỉ dùng số do server tính", async () => {
        const order = await service.placeOrder(
          validInput({ couponCode: "SHOPLITE10", discount: 600_000, subtotal: 1, total: 0 }),
        );

        // p010 x2 = 300.000đ → SHOPLITE10 giảm 30.000đ, phí ship tiêu chuẩn 30.000đ
        expect(order).toMatchObject({
          subtotal: 300_000,
          discount: 30_000,
          shippingFee: SHIPPING_OPTIONS.standard.fee,
          total: 300_000,
        });
      });

      it("mã hết hạn → COUPON_EXPIRED, không lưu đơn", async () => {
        const error = await expectOrderError(
          serviceAt(new Date("2026-03-01T00:00:00+07:00")).placeOrder(
            validInput({ couponCode: "TET2026" }),
          ),
          "COUPON_EXPIRED",
        );

        expect(error.details?.couponCode).toBe("Mã giảm giá đã hết hạn");
        expect(await repository.findAll()).toEqual([]);
      });

      it("mã còn hạn ở thời điểm cuối cùng của ngày hết hạn", async () => {
        const order = await serviceAt(new Date("2026-02-28T23:59:59.999+07:00")).placeOrder(
          validInput({ couponCode: "TET2026" }),
        );

        // 300.000đ x 15% = 45.000đ
        expect(order).toMatchObject({ couponCode: "TET2026", discount: 45_000 });
      });

      it("đơn chưa đạt giá trị tối thiểu → COUPON_MIN_SUBTOTAL_NOT_MET kèm số tiền cần mua thêm", async () => {
        // Chuột SwiftClick (p006) 450.000đ < 500.000đ của GIAM50K
        const error = await expectOrderError(
          service.placeOrder(
            validInput({ couponCode: "GIAM50K", items: [{ productId: "p006", quantity: 1 }] }),
          ),
          "COUPON_MIN_SUBTOTAL_NOT_MET",
        );

        expect(error.details?.couponCode).toContain(`Mua thêm ${formatCurrency(50_000)}`);
        expect(await repository.findAll()).toEqual([]);
      });

      it("đọc đồng hồ một lần duy nhất cho cả việc xét hạn mã và thời điểm tạo đơn", async () => {
        let time = new Date("2026-02-28T23:59:59.999+07:00").getTime();
        const now = vi.fn(() => new Date(time++));
        const timedService = createOrderService({ repository, now, generateId: () => "SL-1" });

        const order = await timedService.placeOrder(validInput({ couponCode: "TET2026" }));

        expect(now).toHaveBeenCalledTimes(1);
        expect(order.createdAt).toBe(new Date("2026-02-28T23:59:59.999+07:00").toISOString());
      });

      it("tổng số lượng sau khi gộp dòng trùng vượt 10 → VALIDATION_ERROR (FR-023)", async () => {
        await expectOrderError(
          service.placeOrder(
            validInput({
              items: [
                { productId: "p006", quantity: 10 },
                { productId: "p006", quantity: 1 },
              ],
            }),
          ),
          "VALIDATION_ERROR",
        );
        expect(await repository.findAll()).toEqual([]);
      });

      it("tổng số lượng sau khi gộp đúng bằng 10 vẫn hợp lệ", async () => {
        const order = await service.placeOrder(
          validInput({
            items: [
              { productId: "p010", quantity: 6 },
              { productId: "p010", quantity: 4 },
            ],
          }),
        );
        expect(order.items[0].quantity).toBe(10);
      });
    });

    it("trả lỗi INSUFFICIENT_STOCK khi vượt tồn kho hoặc hết hàng", async () => {
      // Giá đỡ laptop (p011) chỉ còn 3 sản phẩm, micro (p004) đã hết hàng
      await expectOrderError(
        service.placeOrder(validInput({ items: [{ productId: "p011", quantity: 4 }] })),
        "INSUFFICIENT_STOCK",
      );
      await expectOrderError(
        service.placeOrder(validInput({ items: [{ productId: "p004", quantity: 1 }] })),
        "INSUFFICIENT_STOCK",
      );
    });
  });

  describe("listOrders / getOrder", () => {
    it("liệt kê đơn hàng mới nhất trước", async () => {
      let time = FIXED_DATE.getTime();
      const timedService = createOrderService({
        repository,
        now: () => new Date((time += 60_000)),
      });
      const first = await timedService.placeOrder(validInput());
      const second = await timedService.placeOrder(validInput());

      const orders = await timedService.listOrders();
      expect(orders.map((order) => order.id)).toEqual([second.id, first.id]);
    });

    it("trả lỗi ORDER_NOT_FOUND với mã đơn không tồn tại", async () => {
      await expectOrderError(service.getOrder("SL-KHONG-CO"), "ORDER_NOT_FOUND");
    });
  });

  describe("cancelOrder", () => {
    it("hủy đơn đang chờ xác nhận", async () => {
      const order = await service.placeOrder(validInput());
      const cancelled = await service.cancelOrder(order.id);
      expect(cancelled.status).toBe("cancelled");
      expect((await service.getOrder(order.id)).status).toBe("cancelled");
    });

    it("hủy đơn giữ nguyên mã giảm giá và số tiền giảm đã lưu", async () => {
      const order = await service.placeOrder(validInput({ couponCode: "SHOPLITE10" }));
      const cancelled = await service.cancelOrder(order.id);

      expect(cancelled).toMatchObject({
        status: "cancelled",
        couponCode: "SHOPLITE10",
        discount: 30_000,
        total: order.total,
      });
    });

    it("đơn cũ không có thông tin giảm giá vẫn xem, liệt kê và hủy được", async () => {
      const legacy = await service.placeOrder(validInput());
      const legacyWithoutDiscount = { ...legacy };
      delete legacyWithoutDiscount.discount;
      const legacyRepository = createInMemoryOrderRepository([legacyWithoutDiscount]);
      const legacyService = createOrderService({
        repository: legacyRepository,
        now: () => FIXED_DATE,
      });

      expect(await legacyService.getOrder(legacy.id)).not.toHaveProperty("discount");
      expect((await legacyService.listOrders()).map((order) => order.id)).toEqual([legacy.id]);
      const cancelled = await legacyService.cancelOrder(legacy.id);
      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.total).toBe(legacy.total);
    });

    it("không cho hủy đơn đã hủy hoặc đã xác nhận", async () => {
      const order = await service.placeOrder(validInput());
      await repository.save({ ...order, status: "confirmed" });
      await expectOrderError(service.cancelOrder(order.id), "INVALID_STATUS_TRANSITION");
    });
  });
});

describe("generateOrderId", () => {
  it("có dạng SL-YYYYMMDD-XXXXXX", () => {
    expect(generateOrderId(FIXED_DATE)).toMatch(/^SL-20261021-[0-9A-F]{6}$/);
  });
});
