# Data Model: Mã giảm giá khi thanh toán

Tiền luôn là số nguyên VND. Kiểu dưới đây mô tả hình dạng dữ liệu; chữ ký cụ thể sẽ chốt khi
implement theo test.

## Coupon (mã giảm giá) — `src/features/coupons/types.ts`, dữ liệu ở `src/data/coupons.ts`

| Trường        | Kiểu                     | Bắt buộc      | Quy tắc                                                               |
| ------------- | ------------------------ | ------------- | --------------------------------------------------------------------- |
| `code`        | `string`                 | ✓             | Duy nhất, chữ in hoa, `[A-Z0-9]{3,32}`                                |
| `type`        | `"percent"` \| `"fixed"` | ✓             | Union phân biệt theo `type`                                           |
| `percent`     | `number`                 | khi `percent` | Số nguyên 1 – 100                                                     |
| `maxDiscount` | `number`                 | khi `percent` | > 0, trần số tiền giảm (FR-001)                                       |
| `amount`      | `number`                 | khi `fixed`   | > 0                                                                   |
| `minSubtotal` | `number`                 | –             | Tạm tính trước giảm phải `>=` giá trị này (FR-012). Thiếu = không cần |
| `expiresOn`   | `string` `YYYY-MM-DD`    | –             | Ngày cuối còn hiệu lực theo giờ VN (+07:00). Thiếu = không hết hạn    |

Dữ liệu ban đầu (FR-003):

| code       | type    | percent / amount | maxDiscount | minSubtotal | expiresOn  |
| ---------- | ------- | ---------------- | ----------- | ----------- | ---------- |
| SHOPLITE10 | percent | 10               | 100_000     | 300_000     | –          |
| GIAM50K    | fixed   | 50_000           | –           | 500_000     | –          |
| TET2026    | percent | 15               | 200_000     | –           | 2026-02-28 |

Một unit test kiểm tra tính toàn vẹn dữ liệu: mã duy nhất, đã in hoa, trường bắt buộc theo `type`.

**PublicCoupon**: chính `Coupon` của mã khách đã nhập, trả về qua API để client tự tính lại. Hiện
tại trùng hình dạng với `Coupon`; tách kiểu để sau này có thể bỏ trường nội bộ.

## CouponEvaluation (kết quả kiểm tra) — trả về từ `evaluateCoupon(coupon | undefined, subtotal, now)`

```text
{ status: "valid", discount }
{ status: "invalid", reason: "not_found" }
{ status: "invalid", reason: "expired" }
{ status: "invalid", reason: "min_subtotal_not_met", minSubtotal, shortfall }   // shortfall = minSubtotal − subtotal
```

- Thứ tự kiểm tra: tồn tại → còn hạn → đạt tối thiểu; trả lý do đầu tiên (FR-006).
- `discount` theo [research.md §4](./research.md); luôn `0 <= discount <= subtotal`.
- `getCouponErrorMessage(evaluation)` → câu chữ FR-007, tiền qua `formatCurrency`:
  - `not_found` → "Mã giảm giá không tồn tại"
  - `expired` → "Mã giảm giá đã hết hạn"
  - `min_subtotal_not_met` → "Đơn hàng chưa đạt giá trị tối thiểu {minSubtotal} để dùng mã này.
    Mua thêm {shortfall} để được giảm giá."
- Ô trống (FR-008) xử lý ở schema/UI: "Vui lòng nhập mã giảm giá".

Ánh xạ sang mã lỗi API: `not_found` → `COUPON_NOT_FOUND`, `expired` → `COUPON_EXPIRED`,
`min_subtotal_not_met` → `COUPON_MIN_SUBTOTAL_NOT_MET` (đều 422).

## AppliedCoupon (mã đang áp dụng ở trang thanh toán) — `applied-coupon-store.ts`, chỉ ở client

```text
AppliedCouponState = null | { coupon: PublicCoupon, serverError?: { code, message } }
```

Trạng thái suy ra mỗi lần render từ `(state, subtotal hiện tại, now)`:

| Trạng thái hiển thị | Điều kiện                                           | Số tiền giảm | Nút "Đặt hàng" |
| ------------------- | --------------------------------------------------- | ------------ | -------------- |
| (không có mã)       | `state === null`                                    | 0            | bật            |
| `active`            | `evaluateCoupon` = valid và không có `serverError`  | `discount`   | bật            |
| `suspended`         | `evaluateCoupon` = `min_subtotal_not_met`           | 0            | **tắt**        |
| `blocked`           | có `serverError`, hoặc `evaluateCoupon` = `expired` | 0            | **tắt**        |

Chuyển trạng thái:

```text
null ──Áp dụng (API 200)──▶ active
active ──giỏ tụt dưới minSubtotal──▶ suspended ──giỏ đạt lại minSubtotal──▶ active   (Clarification Q2)
active ──đặt hàng bị từ chối COUPON_*──▶ blocked                                     (Clarification Q1)
active/suspended/blocked ──Gỡ mã──▶ null
```

- `blocked` không tự hết; chỉ "Gỡ mã" mới thoát (Q1). `suspended` tự về `active` (Q2).
- Áp dụng thất bại (API 422) không tạo state — chỉ hiển thị lỗi tại ô nhập.
- Không lưu bền: mất khi tải lại trang; `getServerSnapshot` trả `null`.

## Order (mở rộng) — `src/features/orders/types.ts`

| Trường mới   | Kiểu     | Bắt buộc | Quy tắc                                                                             |
| ------------ | -------- | -------- | ----------------------------------------------------------------------------------- |
| `couponCode` | `string` | –        | Mã in hoa đã dùng; chỉ có khi đơn dùng mã                                           |
| `discount`   | `number` | –        | Số tiền giảm tại thời điểm đặt. Đơn mới luôn ghi (0 nếu không mã); đơn cũ thiếu = 0 |

- Bất biến: `total = subtotal − (discount ?? 0) + shippingFee`; `shippingFee` tính từ `subtotal`
  trước giảm (FR-011).
- `couponCode`/`discount` không bao giờ được tính lại sau khi lưu (FR-020); `cancelOrder` giữ nguyên.
- Không migration: đơn cũ trong `storage/orders.json` đọc ra với hai trường `undefined` (FR-022).

## OrderTotals (kết quả tính tiền) — `src/features/checkout/pricing.ts`

```text
calculateOrderTotals(lines, method, discount = 0) → { subtotal, discount, shippingFee, total }
```

- `discount` đầu vào được kẹp vào `[0, subtotal]`.
- `shippingFee = calculateShippingFee(subtotal, method)` — không đổi.

## Input schemas (Zod)

- `placeOrderSchema` thêm `couponCode: string` tùy chọn — trim, in hoa, tối đa 32 ký tự; chuỗi rỗng
  sau trim coi như không có mã. Không có trường tiền nào (constitution III).
- `checkCouponSchema` (mới, `coupon-schema.ts`): `{ couponCode: string (trim, min 1 "Vui lòng nhập mã
giảm giá", max 32), items: orderItemsSchema }` — `orderItemsSchema` tách ra từ
  `placeOrderSchema` để dùng chung.
