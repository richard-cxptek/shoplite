// @vitest-environment node
import { describe, expect, it } from "vitest";
import { OrderError } from "@/features/orders/order-errors";
import { formatCurrency } from "@/lib/format";
import { createCouponService } from "./coupon-service";

const NOW = new Date("2026-11-08T10:00:00+07:00");
const service = createCouponService({ now: () => NOW });

function catchError(fn: () => unknown): OrderError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(OrderError);
    return error as OrderError;
  }
  throw new Error("Không có lỗi nào được ném ra");
}

describe("couponService.check - mã hợp lệ", () => {
  it("chuẩn hóa mã, tính tạm tính từ giá catalog và trả về quy tắc của mã", () => {
    // Cáp USB-C (p010) 150.000đ x 2 = 300.000đ, đúng bằng tối thiểu của SHOPLITE10
    const result = service.check({
      couponCode: " shoplite10 ",
      items: [{ productId: "p010", quantity: 2 }],
    });

    expect(result).toEqual({
      coupon: {
        code: "SHOPLITE10",
        type: "percent",
        percent: 10,
        maxDiscount: 100_000,
        minSubtotal: 300_000,
      },
      subtotal: 300_000,
      discount: 30_000,
    });
  });

  it("bỏ qua tạm tính và số tiền giảm do client gửi lên", () => {
    const result = service.check({
      couponCode: "SHOPLITE10",
      items: [{ productId: "p010", quantity: 2 }],
      subtotal: 10_000_000,
      discount: 999_999,
    });

    expect(result.subtotal).toBe(300_000);
    expect(result.discount).toBe(30_000);
  });
});

describe("couponService.check - dữ liệu không hợp lệ", () => {
  it.each([
    ["thiếu mã", {}],
    ["mã rỗng", { couponCode: "" }],
    ["mã chỉ có khoảng trắng", { couponCode: "   " }],
  ])("%s → VALIDATION_ERROR tại trường couponCode", (_, body) => {
    const error = catchError(() =>
      service.check({ ...body, items: [{ productId: "p010", quantity: 1 }] }),
    );
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.details?.couponCode).toBe("Vui lòng nhập mã giảm giá");
  });

  it("sản phẩm không tồn tại → PRODUCT_NOT_FOUND", () => {
    const error = catchError(() =>
      service.check({ couponCode: "SHOPLITE10", items: [{ productId: "p999", quantity: 1 }] }),
    );
    expect(error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("mã không tồn tại → COUPON_NOT_FOUND kèm thông báo tại trường couponCode", () => {
    const error = catchError(() =>
      service.check({ couponCode: "KHONGCO", items: [{ productId: "p010", quantity: 2 }] }),
    );
    expect(error.code).toBe("COUPON_NOT_FOUND");
    expect(error.httpStatus).toBe(422);
    expect(error.details?.couponCode).toBe("Mã giảm giá không tồn tại");
  });
});

describe("couponService.check - lý do mã không hợp lệ", () => {
  it("mã đã hết hạn → COUPON_EXPIRED", () => {
    const afterExpiry = createCouponService({ now: () => new Date("2026-03-01T00:00:00+07:00") });
    const error = catchError(() =>
      afterExpiry.check({ couponCode: "TET2026", items: [{ productId: "p010", quantity: 2 }] }),
    );

    expect(error.code).toBe("COUPON_EXPIRED");
    expect(error.message).toBe("Mã giảm giá đã hết hạn");
    expect(error.details?.couponCode).toBe("Mã giảm giá đã hết hạn");
  });

  it("chưa đạt tối thiểu → COUPON_MIN_SUBTOTAL_NOT_MET kèm giá trị tối thiểu và số tiền cần mua thêm", () => {
    // Chuột SwiftClick (p006) 450.000đ, GIAM50K cần 500.000đ
    const error = catchError(() =>
      service.check({ couponCode: "GIAM50K", items: [{ productId: "p006", quantity: 1 }] }),
    );
    const expected =
      `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(500_000)} để dùng mã này. ` +
      `Mua thêm ${formatCurrency(50_000)} để được giảm giá.`;

    expect(error.code).toBe("COUPON_MIN_SUBTOTAL_NOT_MET");
    expect(error.message).toBe(expected);
    expect(error.details?.couponCode).toBe(expected);
  });

  it("vừa hết hạn vừa chưa đủ tối thiểu thì báo hết hạn trước", () => {
    const afterExpiry = createCouponService({
      now: () => new Date("2026-03-01T00:00:00+07:00"),
      findCoupon: () => ({
        code: "HETHAN",
        type: "fixed",
        amount: 10_000,
        minSubtotal: 5_000_000,
        expiresOn: "2026-02-28",
      }),
    });
    const error = catchError(() =>
      afterExpiry.check({ couponCode: "HETHAN", items: [{ productId: "p010", quantity: 1 }] }),
    );

    expect(error.code).toBe("COUPON_EXPIRED");
  });
});
