import type { Coupon } from "@/features/coupons/types";

/**
 * Danh sách mã giảm giá (read-only). Tiền tính bằng VND.
 * CHỈ import từ code phía server (`features/coupons/coupon-service.ts`, `features/orders`) -
 * không import trong Client Component để không lộ danh sách mã ra trình duyệt.
 */
export const COUPONS: Coupon[] = [
  { code: "SHOPLITE10", type: "percent", percent: 10, maxDiscount: 100_000, minSubtotal: 300_000 },
  { code: "GIAM50K", type: "fixed", amount: 50_000, minSubtotal: 500_000 },
  // Đã hết hạn - dùng để kiểm thử mã hết hạn
  { code: "TET2026", type: "percent", percent: 15, maxDiscount: 200_000, expiresOn: "2026-02-28" },
];
