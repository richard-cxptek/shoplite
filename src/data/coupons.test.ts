import { describe, expect, it } from "vitest";
import { COUPONS } from "./coupons";

describe("COUPONS - toàn vẹn dữ liệu mã giảm giá", () => {
  it("mã là duy nhất", () => {
    const codes = COUPONS.map((coupon) => coupon.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("mã viết in hoa, chỉ gồm chữ và số, dài 3 – 32 ký tự", () => {
    for (const coupon of COUPONS) {
      expect(coupon.code).toMatch(/^[A-Z0-9]{3,32}$/);
    }
  });

  it("có đủ trường bắt buộc theo loại mã", () => {
    for (const coupon of COUPONS) {
      if (coupon.type === "percent") {
        expect(Number.isInteger(coupon.percent)).toBe(true);
        expect(coupon.percent).toBeGreaterThanOrEqual(1);
        expect(coupon.percent).toBeLessThanOrEqual(100);
        expect(coupon.maxDiscount).toBeGreaterThan(0);
      } else {
        expect(coupon.amount).toBeGreaterThan(0);
      }
    }
  });

  it("ngày hết hạn (nếu có) đúng định dạng YYYY-MM-DD", () => {
    for (const coupon of COUPONS) {
      if (coupon.expiresOn !== undefined) {
        expect(coupon.expiresOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(`${coupon.expiresOn}T00:00:00+07:00`))).toBe(false);
      }
    }
  });

  it("có đúng ba mã khuyến mãi ban đầu", () => {
    expect(COUPONS).toEqual([
      {
        code: "SHOPLITE10",
        type: "percent",
        percent: 10,
        maxDiscount: 100_000,
        minSubtotal: 300_000,
      },
      { code: "GIAM50K", type: "fixed", amount: 50_000, minSubtotal: 500_000 },
      {
        code: "TET2026",
        type: "percent",
        percent: 15,
        maxDiscount: 200_000,
        expiresOn: "2026-02-28",
      },
    ]);
  });
});
