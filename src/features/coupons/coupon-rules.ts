/**
 * Quy tắc mã giảm giá - hàm thuần, dùng chung cho client (hiển thị) và server (tính lại khi đặt hàng).
 * KHÔNG import `@/data/coupons` ở đây: file này được dùng trong Client Component, import dữ liệu sẽ
 * làm lộ toàn bộ danh sách mã ra trình duyệt. Tra mã chỉ làm ở `coupon-service.ts` (server).
 */
import { formatCurrency } from "@/lib/format";
import type { Coupon, CouponEvaluation, PublicCoupon } from "./types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** " shoplite10 " -> "SHOPLITE10" */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Mã còn hiệu lực tới hết ngày `expiresOn` theo giờ Việt Nam (UTC+7, không có giờ mùa hè). */
export function isCouponExpired(coupon: Coupon, now: Date): boolean {
  if (coupon.expiresOn === undefined) return false;
  const endOfLastDay = Date.parse(`${coupon.expiresOn}T00:00:00+07:00`) + ONE_DAY_MS;
  return now.getTime() >= endOfLastDay;
}

/** Số tiền giảm (đồng, số nguyên), không bao giờ vượt quá tạm tính. Không xét hạn / tối thiểu. */
export function calculateDiscount(coupon: Coupon, subtotal: number): number {
  const raw =
    coupon.type === "percent"
      ? Math.min(Math.floor((subtotal * coupon.percent) / 100), coupon.maxDiscount)
      : coupon.amount;
  return Math.max(0, Math.min(raw, subtotal));
}

/** Kiểm tra mã theo thứ tự: tồn tại → còn hạn → đạt giá trị tối thiểu. */
export function evaluateCoupon(
  coupon: Coupon | undefined,
  subtotal: number,
  now: Date,
): CouponEvaluation {
  if (!coupon) return { status: "invalid", reason: "not_found" };
  if (isCouponExpired(coupon, now)) return { status: "invalid", reason: "expired" };
  if (coupon.minSubtotal !== undefined && subtotal < coupon.minSubtotal) {
    return {
      status: "invalid",
      reason: "min_subtotal_not_met",
      minSubtotal: coupon.minSubtotal,
      shortfall: coupon.minSubtotal - subtotal,
    };
  }
  return { status: "valid", discount: calculateDiscount(coupon, subtotal) };
}

/** Thông báo tiếng Việt cho mã không hợp lệ - dùng chung cho API và trang thanh toán. */
export function getCouponErrorMessage(
  evaluation: Extract<CouponEvaluation, { status: "invalid" }>,
): string {
  switch (evaluation.reason) {
    case "not_found":
      return "Mã giảm giá không tồn tại";
    case "expired":
      return "Mã giảm giá đã hết hạn";
    case "min_subtotal_not_met":
      return (
        `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(evaluation.minSubtotal)} để dùng mã này. ` +
        `Mua thêm ${formatCurrency(evaluation.shortfall)} để được giảm giá.`
      );
  }
}

/** Quy tắc của một mã gửi cho client (bản sao, không trả object dữ liệu gốc). */
export function toPublicCoupon(coupon: Coupon): PublicCoupon {
  return { ...coupon };
}
