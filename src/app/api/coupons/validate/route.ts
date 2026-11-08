import { NextResponse } from "next/server";
import { couponService } from "@/features/coupons/coupon-service";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

/** POST /api/coupons/validate - kiểm tra mã giảm giá cho giỏ hàng. Body: { couponCode, items }. */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) {
    return jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ");
  }

  try {
    return NextResponse.json(couponService.check(body));
  } catch (error) {
    return handleRouteError(error);
  }
}
