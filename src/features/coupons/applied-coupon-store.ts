import { useSyncExternalStore } from "react";
import { evaluateCoupon, getCouponErrorMessage } from "./coupon-rules";
import type { PublicCoupon } from "./types";

/** Lỗi server trả về khi đặt hàng với mã này (ví dụ mã vừa hết hạn). */
export interface CouponServerError {
  code: string;
  message: string;
}

/** Mã khách đã áp dụng thành công ở trang thanh toán. */
export type AppliedCouponState = { coupon: PublicCoupon; serverError?: CouponServerError } | null;

/**
 * Trạng thái hiển thị của mã, suy ra từ state + tạm tính hiện tại + thời điểm hiện tại.
 * - active: đang hiệu lực, có số tiền giảm.
 * - suspended: tạm ngưng vì tạm tính chưa đạt tối thiểu - tự về active khi đạt lại (FR-016).
 * - blocked: bị chặn (server từ chối hoặc trình duyệt thấy mã hết hạn) - chỉ thoát bằng "Gỡ mã".
 * Không có mã / không hiệu lực thì số tiền giảm luôn là 0.
 */
export type AppliedCouponStatus =
  | { status: "none"; discount: 0 }
  | { status: "active"; coupon: PublicCoupon; discount: number }
  | { status: "suspended"; coupon: PublicCoupon; discount: 0; message: string }
  | { status: "blocked"; coupon: PublicCoupon; discount: 0; message: string };

export function getAppliedCouponStatus(
  state: AppliedCouponState,
  subtotal: number,
  now: Date,
): AppliedCouponStatus {
  if (state === null) return { status: "none", discount: 0 };

  const { coupon, serverError } = state;
  if (serverError) {
    return { status: "blocked", coupon, discount: 0, message: serverError.message };
  }

  const evaluation = evaluateCoupon(coupon, subtotal, now);
  if (evaluation.status === "valid") {
    return { status: "active", coupon, discount: evaluation.discount };
  }
  if (evaluation.reason === "min_subtotal_not_met") {
    return { status: "suspended", coupon, discount: 0, message: getCouponErrorMessage(evaluation) };
  }
  return { status: "blocked", coupon, discount: 0, message: getCouponErrorMessage(evaluation) };
}

type Listener = () => void;

let state: AppliedCouponState = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Store mã giảm giá đang áp dụng - chỉ nằm trong bộ nhớ trình duyệt (KHÔNG dùng localStorage),
 * giữ được khi khách chuyển qua lại giữa /cart và /checkout, mất khi tải lại trang.
 * Chỉ được thay đổi từ event handler phía client; server luôn thấy `null`.
 */
export const appliedCouponStore = {
  getSnapshot(): AppliedCouponState {
    return state;
  },

  getServerSnapshot(): AppliedCouponState {
    return null;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  apply(coupon: PublicCoupon): void {
    state = { coupon };
    emit();
  },

  /** Đánh dấu mã bị server từ chối khi đặt hàng: giữ mã, chặn đặt hàng tới khi khách gỡ mã. */
  markServerError(serverError: CouponServerError): void {
    if (state === null) return;
    state = { ...state, serverError };
    emit();
  },

  clear(): void {
    if (state === null) return;
    state = null;
    emit();
  },

  /** Chỉ dùng trong test: xóa mã mà không báo cho listener. */
  reset(): void {
    state = null;
  },
};

export function useAppliedCoupon(): AppliedCouponState {
  return useSyncExternalStore(
    appliedCouponStore.subscribe,
    appliedCouponStore.getSnapshot,
    appliedCouponStore.getServerSnapshot,
  );
}

/** Trạng thái mã đang áp dụng cho tạm tính hiện tại (tính lại mỗi lần render). */
export function useAppliedCouponStatus(subtotal: number): AppliedCouponStatus {
  return getAppliedCouponStatus(useAppliedCoupon(), subtotal, new Date());
}
