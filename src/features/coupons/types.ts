/** Thuộc tính chung của mọi mã giảm giá. Tiền tính bằng VND (số nguyên). */
interface CouponBase {
  /** Duy nhất, chữ in hoa, dạng `[A-Z0-9]{3,32}`. */
  code: string;
  /** Tạm tính (trước giảm giá) phải >= giá trị này. Không có = không yêu cầu tối thiểu. */
  minSubtotal?: number;
  /** Ngày cuối còn hiệu lực dạng `YYYY-MM-DD`, theo giờ Việt Nam (+07:00). Không có = không hết hạn. */
  expiresOn?: string;
}

/** Giảm theo phần trăm tạm tính, có mức giảm tối đa. */
export interface PercentCoupon extends CouponBase {
  type: "percent";
  /** Số nguyên 1 – 100. */
  percent: number;
  /** Trần số tiền giảm, > 0. */
  maxDiscount: number;
}

/** Giảm một số tiền cố định. */
export interface FixedCoupon extends CouponBase {
  type: "fixed";
  /** Số tiền giảm, > 0. */
  amount: number;
}

export type Coupon = PercentCoupon | FixedCoupon;

/** Quy tắc của một mã được trả về cho client (chỉ mã khách đã nhập) để tự tính lại khi giỏ đổi. */
export type PublicCoupon = Coupon;

/** Kết quả trả về của POST /api/coupons/validate. */
export interface CouponCheckResult {
  coupon: PublicCoupon;
  /** Tạm tính do server tính từ giá catalog. */
  subtotal: number;
  discount: number;
}

export type CouponInvalidReason = "not_found" | "expired" | "min_subtotal_not_met";

/** Kết quả kiểm tra một mã với tạm tính và thời điểm cho trước. */
export type CouponEvaluation =
  | { status: "valid"; discount: number }
  | { status: "invalid"; reason: "not_found" | "expired" }
  | {
      status: "invalid";
      reason: "min_subtotal_not_met";
      minSubtotal: number;
      /** Số tiền cần mua thêm = minSubtotal − subtotal. */
      shortfall: number;
    };
