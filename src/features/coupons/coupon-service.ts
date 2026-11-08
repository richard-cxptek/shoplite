/**
 * Tra cứu và kiểm tra mã giảm giá phía SERVER.
 * Chỉ import từ route handler / Server Component / order-service - file này đọc `@/data/coupons`,
 * import vào Client Component sẽ làm lộ toàn bộ danh sách mã ra trình duyệt.
 */
import { COUPONS } from "@/data/coupons";
import { getProductById } from "@/features/catalog/catalog-service";
import type { Product } from "@/features/catalog/types";
import { toFieldErrors } from "@/features/checkout/checkout-schema";
import { calculateSubtotal } from "@/features/checkout/pricing";
import { OrderError } from "@/features/orders/order-errors";
import { toCouponOrderError } from "./coupon-errors";
import { evaluateCoupon, normalizeCouponCode, toPublicCoupon } from "./coupon-rules";
import { checkCouponSchema } from "./coupon-schema";
import type { Coupon, CouponCheckResult } from "./types";

/** Tìm mã theo chuỗi khách nhập (không phân biệt hoa thường, bỏ khoảng trắng đầu/cuối). */
export function findCouponByCode(code: string): Coupon | undefined {
  const normalized = normalizeCouponCode(code);
  return COUPONS.find((coupon) => coupon.code === normalized);
}

export interface CouponServiceDeps {
  findCoupon?: (code: string) => Coupon | undefined;
  findProduct?: (id: string) => Product | undefined;
  now?: () => Date;
}

export function createCouponService({
  findCoupon = findCouponByCode,
  findProduct = getProductById,
  now = () => new Date(),
}: CouponServiceDeps = {}) {
  return {
    /**
     * Kiểm tra mã cho giỏ hàng để hiển thị ở trang thanh toán. Tạm tính luôn tính từ giá catalog,
     * bỏ qua mọi số tiền client gửi lên. Kết quả chỉ để hiển thị - khi đặt hàng server kiểm tra lại.
     */
    check(input: unknown): CouponCheckResult {
      const parsed = checkCouponSchema.safeParse(input);
      if (!parsed.success) {
        throw new OrderError(
          "VALIDATION_ERROR",
          "Thông tin mã giảm giá không hợp lệ",
          toFieldErrors(parsed.error),
        );
      }

      const { couponCode, items } = parsed.data;
      const lines = items.map(({ productId, quantity }) => {
        const product = findProduct(productId);
        if (!product) {
          throw new OrderError("PRODUCT_NOT_FOUND", `Không tìm thấy sản phẩm "${productId}"`);
        }
        return { unitPrice: product.price, quantity };
      });
      const subtotal = calculateSubtotal(lines);

      const coupon = findCoupon(couponCode);
      const evaluation = evaluateCoupon(coupon, subtotal, now());
      if (evaluation.status === "invalid") throw toCouponOrderError(evaluation);

      return { coupon: toPublicCoupon(coupon!), subtotal, discount: evaluation.discount };
    },
  };
}

export type CouponService = ReturnType<typeof createCouponService>;

export const couponService = createCouponService();
