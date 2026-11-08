# Implementation Plan: Mã giảm giá khi thanh toán

**Branch**: `001-discount-codes` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-discount-codes/spec.md`

## Summary

Khách nhập mã giảm giá ở trang thanh toán; mã được server kiểm tra qua endpoint mới
`POST /api/coupons/validate` (tồn tại → còn hạn → đạt tối thiểu), trả về quy tắc của mã để client
tự tính lại số tiền giảm mỗi khi giỏ thay đổi (trạng thái "tạm ngưng" / tự có hiệu lực lại). Khi
đặt hàng, client chỉ gửi thêm `couponCode`; `orderService.placeOrder` kiểm tra lại mã với giá
catalog và thời điểm hiện tại, tính số tiền giảm và tổng tiền bằng cùng hàm thuần, rồi lưu
`couponCode` + `discount` vào đơn. Danh sách mã là dữ liệu tĩnh `src/data/coupons.ts`, chỉ được
import phía server để không lộ toàn bộ mã trong bundle trình duyệt. Logic thuần nằm ở
`src/features/coupons/`; `pricing.ts` nhận thêm số tiền giảm và giữ nguyên quy tắc phí ship
(xét theo tạm tính trước giảm — FR-011).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js >= 22.12

**Primary Dependencies**: Next.js 16.4 (App Router), React 19.3, Zod 4, Tailwind CSS v4,
lucide-react, clsx — không thêm dependency mới

**Storage**: Mã giảm giá: module tĩnh `src/data/coupons.ts`. Đơn hàng: file JSON qua
`OrderRepository` hiện có (thêm 2 trường tùy chọn, không migration). Mã đang áp dụng ở trình
duyệt: store trong bộ nhớ (module-level), không dùng `localStorage`.

**Testing**: Vitest + Testing Library (jsdom mặc định, `// @vitest-environment node` cho
route/service), Playwright cho e2e

**Target Platform**: Trình duyệt hiện đại + Node.js server (Next.js)

**Project Type**: Web application (Next.js full-stack, một project)

**Performance Goals**: Hiển thị kết quả "Áp dụng" < 1 giây (SC-001); tính lại số tiền giảm khi
giỏ thay đổi là đồng bộ, không gọi mạng

**Constraints**: Server là nguồn sự thật về tiền; không thêm dependency/database; text tiếng Việt;
đơn cũ không có trường giảm giá vẫn hiển thị đúng; không lộ danh sách mã ra client

**Scale/Scope**: 3 mã ban đầu, danh sách tĩnh (< 50 mã); ~9 file mới, ~11 file sửa

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Nguyên tắc                                    | Đánh giá                                                                                                                                                                                                                                         | Kết quả |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| I. Kiến trúc theo tính năng                   | Logic ở `src/features/coupons/`; route `api/coupons/validate/route.ts` chỉ đọc body → gọi `couponService.check` → trả JSON; trang chi tiết đơn dùng component `OrderTotals` trong `features/orders/components/`. Dữ liệu mã ở `src/data/`.       | PASS    |
| II. Test trước cho nghiệp vụ (NON-NEGOTIABLE) | Mọi quy tắc (tính giảm, làm tròn, trần, tối thiểu, hết hạn, thứ tự lỗi, phí ship trước giảm, tạm ngưng/hiệu lực lại) có unit test viết trước kèm giá trị biên — danh sách ở [research.md §9](./research.md). `npm run check` + e2e là cổng cuối. | PASS    |
| III. Server là nguồn sự thật về tiền          | Client chỉ gửi `couponCode`; `placeOrderSchema` không có trường tiền; server tính lại `discount`/`total` từ catalog. Client hiển thị bằng chính `calculateDiscount` + `calculateOrderTotals`. Input validate bằng Zod; lỗi qua `OrderError`.     | PASS    |
| IV. Đơn giản trước                            | Không dependency, không database. Abstraction mới duy nhất là store trong bộ nhớ cho mã đang áp dụng (cần để giữ mã khi khách quay lại giỏ — User Story 3), theo đúng mẫu `useSyncExternalStore` của `cart-store.ts`.                            | PASS    |
| V. Tiếng Việt và dễ tiếp cận                  | Thông báo FR-007/FR-008 tiếng Việt, tiền qua `formatCurrency`; ô "Mã giảm giá" có `<label>`, lỗi tại trường (`aria-invalid`, `aria-describedby`, `role="alert"`); nút có tên truy cập được.                                                      | PASS    |

**Ràng buộc kỹ thuật & quy trình**: quy tắc giỏ hàng, phí ship, hủy đơn giữ nguyên (FR-011 xác nhận
phí ship không đổi). Mã lỗi mới thêm vào `OrderErrorCode` + `HTTP_STATUS_BY_CODE`. Spec không còn
câu hỏi mở. ⚠️ Nhánh git hiện tại là `repo/trandinhduc`, chưa phải nhánh riêng — MUST tạo
`001-discount-codes` trước khi implement.

**Re-check sau Phase 1**: PASS — thiết kế ở [data-model.md](./data-model.md) và
[contracts/](./contracts/) không thêm trường tiền vào input, không đặt logic trong `src/app/`,
không thêm dependency. Không có vi phạm cần ghi vào Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-discount-codes/
├── plan.md                         # File này
├── research.md                     # Phase 0: các quyết định thiết kế
├── data-model.md                   # Phase 1: Coupon, CouponEvaluation, AppliedCoupon, Order mở rộng
├── quickstart.md                   # Phase 1: kịch bản kiểm chứng
├── contracts/
│   ├── coupons-validate.md         # POST /api/coupons/validate (mới)
│   ├── orders-post.md              # POST /api/orders (thêm couponCode) + GET orders (trường mới)
│   └── checkout-ui.md              # Hợp đồng UI: nhãn, data-testid, trạng thái
├── checklists/requirements.md
└── tasks.md                        # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                          # MỚI - COUPONS: Coupon[] (SHOPLITE10, GIAM50K, TET2026); chỉ server import
├── features/
│   ├── coupons/                            # MỚI
│   │   ├── types.ts                        # Coupon, PublicCoupon, CouponEvaluation, CouponInvalidReason
│   │   ├── coupon-rules.ts (+ .test.ts)    # thuần, dùng được ở client: normalizeCouponCode, isCouponExpired,
│   │   │                                   #   calculateDiscount, evaluateCoupon, getCouponErrorMessage, toPublicCoupon
│   │   ├── coupon-schema.ts (+ .test.ts)   # checkCouponSchema (Zod) cho POST /api/coupons/validate
│   │   ├── coupon-errors.ts                # toCouponOrderError: lý do → OrderError (dùng chung server)
│   │   ├── coupon-service.ts (+ .test.ts)  # server: createCouponService({ findCoupon, findProduct, now }) → check()
│   │   ├── applied-coupon-store.ts (+ .test.ts)  # client: store bộ nhớ + useAppliedCoupon(subtotal)
│   │   └── components/
│   │       └── coupon-field.tsx (+ .test.tsx)    # "use client": ô nhập, Áp dụng, Gỡ mã, thông báo
│   ├── checkout/
│   │   ├── pricing.ts (+ .test.ts)         # SỬA: calculateOrderTotals(lines, method, discount = 0) → + discount
│   │   ├── checkout-schema.ts (+ .test.ts) # SỬA: placeOrderSchema + couponCode?; export orderItemsSchema
│   │   └── components/
│   │       ├── checkout-summary.tsx        # SỬA: dòng "Giảm giá (MÃ)" + data-testid
│   │       └── checkout-form.tsx (+ .test.tsx)  # SỬA: gắn CouponField, gửi couponCode, chặn đặt hàng, xử lý lỗi COUPON_*
│   └── orders/
│       ├── types.ts                        # SỬA: Order.couponCode?, Order.discount?
│       ├── order-errors.ts                 # SỬA: COUPON_NOT_FOUND, COUPON_EXPIRED, COUPON_MIN_SUBTOTAL_NOT_MET (422)
│       ├── order-service.ts (+ .test.ts)   # SỬA: kiểm tra lại mã, tính giảm, deps findCoupon
│       └── components/
│           └── order-totals.tsx (+ .test.tsx)   # MỚI: tạm tính / giảm giá / phí ship / tổng — xử lý đơn cũ
├── app/
│   ├── api/coupons/validate/route.ts (+ route.test.ts)  # MỚI - route mỏng
│   ├── api/orders/route.test.ts            # SỬA: thêm case mã giảm giá
│   └── orders/[id]/page.tsx                # SỬA: dùng <OrderTotals order={order} />
e2e/
└── shopping-flow.spec.ts                   # SỬA - thêm kịch bản dùng mã SHOPLITE10
AGENTS.md                                   # SỬA: thêm dòng Coupons vào codemap + luồng
```

**Structure Decision**: Giữ cấu trúc một project Next.js theo tính năng. Feature mới
`src/features/coupons/` phụ thuộc một chiều vào `checkout` (`calculateSubtotal`,
`orderItemsSchema`) và `catalog` (`getProductById`); `orders` phụ thuộc `coupons`. `pricing.ts`
không import `coupons` (nhận `discount` dạng số) để tránh vòng phụ thuộc. Chỉ `coupon-service.ts`
được import `@/data/coupons`; file `"use client"` chỉ import `coupon-rules.ts`, `types.ts`,
`applied-coupon-store.ts`.

## Complexity Tracking

Không có vi phạm constitution cần biện minh.
