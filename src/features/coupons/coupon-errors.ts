import { OrderError, type OrderErrorCode } from "@/features/orders/order-errors";
import { getCouponErrorMessage } from "./coupon-rules";
import type { CouponEvaluation, CouponInvalidReason } from "./types";

const ERROR_CODE_BY_REASON: Record<CouponInvalidReason, OrderErrorCode> = {
  not_found: "COUPON_NOT_FOUND",
  expired: "COUPON_EXPIRED",
  min_subtotal_not_met: "COUPON_MIN_SUBTOTAL_NOT_MET",
};

/**
 * Chuyển kết quả "mã không hợp lệ" thành lỗi API. Thông báo đặt ở `details.couponCode`
 * để trang thanh toán hiển thị ngay tại ô nhập mã. Dùng chung cho kiểm tra mã và đặt hàng.
 */
export function toCouponOrderError(
  evaluation: Extract<CouponEvaluation, { status: "invalid" }>,
): OrderError {
  const message = getCouponErrorMessage(evaluation);
  return new OrderError(ERROR_CODE_BY_REASON[evaluation.reason], message, {
    couponCode: message,
  });
}
