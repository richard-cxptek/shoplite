import { describe, expect, it } from "vitest";
import {
  amountUntilFreeShipping,
  calculateOrderTotals,
  calculateShippingFee,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_OPTIONS,
} from "./pricing";

describe("calculateShippingFee", () => {
  it("tính phí tiêu chuẩn khi đơn dưới ngưỡng miễn phí", () => {
    expect(calculateShippingFee(FREE_SHIPPING_THRESHOLD - 1, "standard")).toBe(
      SHIPPING_OPTIONS.standard.fee,
    );
  });

  it("miễn phí giao hàng tiêu chuẩn khi đơn đạt ngưỡng", () => {
    expect(calculateShippingFee(FREE_SHIPPING_THRESHOLD, "standard")).toBe(0);
  });

  it("giao hàng nhanh luôn tính phí", () => {
    expect(calculateShippingFee(5_000_000, "express")).toBe(SHIPPING_OPTIONS.express.fee);
  });

  it("không tính phí cho giỏ hàng trống", () => {
    expect(calculateShippingFee(0, "express")).toBe(0);
  });
});

describe("calculateOrderTotals", () => {
  it("cộng tạm tính và phí giao hàng", () => {
    const totals = calculateOrderTotals(
      [
        { unitPrice: 150_000, quantity: 2 },
        { unitPrice: 50_000, quantity: 1 },
      ],
      "standard",
    );
    expect(totals).toEqual({
      subtotal: 350_000,
      discount: 0,
      shippingFee: 30_000,
      total: 380_000,
    });
  });

  describe("có số tiền giảm giá", () => {
    const line = (subtotal: number) => [{ unitPrice: subtotal, quantity: 1 }];

    it("phí giao hàng tiêu chuẩn xét theo tạm tính trước giảm giá (520.000 - 50.000)", () => {
      expect(calculateOrderTotals(line(520_000), "standard", 50_000)).toEqual({
        subtotal: 520_000,
        discount: 50_000,
        shippingFee: 0,
        total: 470_000,
      });
    });

    it("tạm tính đúng bằng ngưỡng miễn phí vẫn được miễn phí sau khi giảm (500.000 - 50.000)", () => {
      expect(calculateOrderTotals(line(500_000), "standard", 50_000)).toEqual({
        subtotal: 500_000,
        discount: 50_000,
        shippingFee: 0,
        total: 450_000,
      });
    });

    it("tạm tính thấp hơn ngưỡng 1đ vẫn tính phí giao hàng tiêu chuẩn", () => {
      expect(calculateOrderTotals(line(499_999), "standard", 49_999)).toEqual({
        subtotal: 499_999,
        discount: 49_999,
        shippingFee: SHIPPING_OPTIONS.standard.fee,
        total: 450_000 + SHIPPING_OPTIONS.standard.fee,
      });
    });

    it("số tiền giảm lớn hơn tạm tính bị giới hạn bằng tạm tính, tổng chỉ còn phí giao hàng", () => {
      expect(calculateOrderTotals(line(100_000), "express", 250_000)).toEqual({
        subtotal: 100_000,
        discount: 100_000,
        shippingFee: SHIPPING_OPTIONS.express.fee,
        total: SHIPPING_OPTIONS.express.fee,
      });
    });

    it("số tiền giảm âm được coi là 0", () => {
      expect(calculateOrderTotals(line(100_000), "standard", -5_000)).toEqual({
        subtotal: 100_000,
        discount: 0,
        shippingFee: SHIPPING_OPTIONS.standard.fee,
        total: 100_000 + SHIPPING_OPTIONS.standard.fee,
      });
    });

    it("giỏ hàng rỗng: mọi giá trị bằng 0", () => {
      expect(calculateOrderTotals([], "express", 50_000)).toEqual({
        subtotal: 0,
        discount: 0,
        shippingFee: 0,
        total: 0,
      });
    });
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});
