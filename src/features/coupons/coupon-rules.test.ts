import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/format";
import {
  calculateDiscount,
  evaluateCoupon,
  getCouponErrorMessage,
  isCouponExpired,
  normalizeCouponCode,
  toPublicCoupon,
} from "./coupon-rules";
import type { Coupon } from "./types";

// Fixture cục bộ - không phụ thuộc dữ liệu thật trong src/data/coupons.ts
const PERCENT_10: Coupon = {
  code: "PHANTRAM10",
  type: "percent",
  percent: 10,
  maxDiscount: 100_000,
  minSubtotal: 300_000,
};
const FIXED_50K: Coupon = {
  code: "CODINH50K",
  type: "fixed",
  amount: 50_000,
  minSubtotal: 500_000,
};
const FIXED_50K_NO_MIN: Coupon = {
  code: "KHONGTOITHIEU",
  type: "fixed",
  amount: 50_000,
};
const EXPIRING: Coupon = {
  code: "HETHAN",
  type: "percent",
  percent: 15,
  maxDiscount: 200_000,
  expiresOn: "2026-02-28",
};
const EXPIRING_WITH_MIN: Coupon = { ...EXPIRING, minSubtotal: 1_000_000 };

const NOW = new Date("2026-01-15T10:00:00+07:00");
const LAST_MOMENT = new Date("2026-02-28T23:59:59.999+07:00");
const FIRST_EXPIRED_MOMENT = new Date("2026-03-01T00:00:00+07:00");

describe("normalizeCouponCode", () => {
  it("bỏ khoảng trắng đầu/cuối và chuyển chữ in hoa", () => {
    expect(normalizeCouponCode(" shoplite10 ")).toBe("SHOPLITE10");
  });

  it("chuỗi chỉ có khoảng trắng thành chuỗi rỗng", () => {
    expect(normalizeCouponCode("   ")).toBe("");
  });
});

describe("isCouponExpired", () => {
  it("mã không có ngày hết hạn thì không bao giờ hết hạn", () => {
    expect(isCouponExpired(PERCENT_10, new Date("2099-01-01T00:00:00+07:00"))).toBe(false);
  });

  it("còn hạn tới hết 23:59:59.999 ngày hết hạn theo giờ Việt Nam", () => {
    expect(isCouponExpired(EXPIRING, LAST_MOMENT)).toBe(false);
  });

  it("hết hạn từ 00:00 ngày hôm sau theo giờ Việt Nam", () => {
    expect(isCouponExpired(EXPIRING, FIRST_EXPIRED_MOMENT)).toBe(true);
  });
});

describe("calculateDiscount", () => {
  it.each([
    [300_000, 30_000],
    [333_335, 33_333], // 33.333,5đ làm tròn xuống
    [1_000_000, 100_000], // 10% đúng bằng mức giảm tối đa
    [1_000_001, 100_000], // vượt mức tối đa
  ])("giảm 10%% (tối đa 100.000đ) trên tạm tính %i → %i", (subtotal, expected) => {
    expect(calculateDiscount(PERCENT_10, subtotal)).toBe(expected);
  });

  it("giảm số tiền cố định", () => {
    expect(calculateDiscount(FIXED_50K, 500_000)).toBe(50_000);
  });

  it("số tiền giảm cố định không vượt quá tạm tính", () => {
    expect(calculateDiscount(FIXED_50K_NO_MIN, 30_000)).toBe(30_000);
  });

  it("tạm tính bằng 0 thì không giảm", () => {
    expect(calculateDiscount(PERCENT_10, 0)).toBe(0);
  });
});

describe("evaluateCoupon", () => {
  it("mã không tồn tại", () => {
    expect(evaluateCoupon(undefined, 500_000, NOW)).toEqual({
      status: "invalid",
      reason: "not_found",
    });
  });

  it("đúng bằng giá trị tối thiểu thì hợp lệ", () => {
    expect(evaluateCoupon(PERCENT_10, 300_000, NOW)).toEqual({
      status: "valid",
      discount: 30_000,
    });
    expect(evaluateCoupon(FIXED_50K, 500_000, NOW)).toEqual({
      status: "valid",
      discount: 50_000,
    });
  });

  it("thấp hơn giá trị tối thiểu 1đ thì báo cần mua thêm 1đ", () => {
    expect(evaluateCoupon(PERCENT_10, 299_999, NOW)).toEqual({
      status: "invalid",
      reason: "min_subtotal_not_met",
      minSubtotal: 300_000,
      shortfall: 1,
    });
    expect(evaluateCoupon(FIXED_50K, 499_999, NOW)).toEqual({
      status: "invalid",
      reason: "min_subtotal_not_met",
      minSubtotal: 500_000,
      shortfall: 1,
    });
  });

  it("mã không có giá trị tối thiểu áp dụng cho mọi giỏ không rỗng", () => {
    expect(evaluateCoupon(FIXED_50K_NO_MIN, 1, NOW)).toEqual({
      status: "valid",
      discount: 1,
    });
  });

  it("mã còn hạn ở thời điểm cuối cùng của ngày hết hạn", () => {
    expect(evaluateCoupon(EXPIRING, 400_000, LAST_MOMENT)).toEqual({
      status: "valid",
      discount: 60_000,
    });
  });

  it("mã đã hết hạn", () => {
    expect(evaluateCoupon(EXPIRING, 400_000, FIRST_EXPIRED_MOMENT)).toEqual({
      status: "invalid",
      reason: "expired",
    });
  });

  it("vừa hết hạn vừa chưa đạt tối thiểu thì báo hết hạn (kiểm tra hạn trước)", () => {
    expect(evaluateCoupon(EXPIRING_WITH_MIN, 100_000, FIRST_EXPIRED_MOMENT)).toEqual({
      status: "invalid",
      reason: "expired",
    });
  });
});

describe("getCouponErrorMessage", () => {
  it("mã không tồn tại", () => {
    expect(getCouponErrorMessage({ status: "invalid", reason: "not_found" })).toBe(
      "Mã giảm giá không tồn tại",
    );
  });

  it("mã đã hết hạn", () => {
    expect(getCouponErrorMessage({ status: "invalid", reason: "expired" })).toBe(
      "Mã giảm giá đã hết hạn",
    );
  });

  it("chưa đạt tối thiểu: nêu giá trị tối thiểu và số tiền cần mua thêm", () => {
    expect(
      getCouponErrorMessage({
        status: "invalid",
        reason: "min_subtotal_not_met",
        minSubtotal: 500_000,
        shortfall: 50_000,
      }),
    ).toBe(
      `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(500_000)} để dùng mã này. ` +
        `Mua thêm ${formatCurrency(50_000)} để được giảm giá.`,
    );
  });
});

describe("toPublicCoupon", () => {
  it("giữ nguyên các trường quy tắc của mã", () => {
    expect(toPublicCoupon(EXPIRING_WITH_MIN)).toEqual(EXPIRING_WITH_MIN);
    expect(toPublicCoupon(FIXED_50K)).toEqual(FIXED_50K);
  });

  it("trả về bản sao, không phải chính object dữ liệu gốc", () => {
    expect(toPublicCoupon(FIXED_50K)).not.toBe(FIXED_50K);
  });
});
