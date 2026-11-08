import { z } from "zod";
import { MAX_COUPON_CODE_LENGTH, orderItemsSchema } from "@/features/checkout/checkout-schema";

const EMPTY_CODE_MESSAGE = "Vui lòng nhập mã giảm giá";

/** Payload gửi lên POST /api/coupons/validate. */
export const checkCouponSchema = z.object({
  couponCode: z
    .string(EMPTY_CODE_MESSAGE)
    .trim()
    .min(1, EMPTY_CODE_MESSAGE)
    .max(MAX_COUPON_CODE_LENGTH, `Mã giảm giá tối đa ${MAX_COUPON_CODE_LENGTH} ký tự`),
  items: orderItemsSchema,
});

export type CheckCouponInput = z.infer<typeof checkCouponSchema>;
