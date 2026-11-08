# Contract: `POST /api/orders` (thay đổi) và đọc đơn hàng

## Request — thêm `couponCode` (tùy chọn)

```json
{
  "customer": {
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "address": "12 Nguyễn Huệ, Q1"
  },
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "items": [{ "productId": "p006", "quantity": 2 }],
  "couponCode": "GIAM50K"
}
```

- `couponCode`: string, trim, in hoa, ≤ 32 ký tự; thiếu hoặc rỗng = không dùng mã.
- **Không có** trường tiền nào. Nếu client gửi `discount`, `subtotal`, `total`… chúng bị Zod loại
  bỏ và không ảnh hưởng kết quả (FR-017).
- Body không có `couponCode` hoạt động y như trước (tương thích ngược).

## Xử lý phía server (`orderService.placeOrder`)

1. Validate `placeOrderSchema` → `VALIDATION_ERROR` 400.
2. Gộp dòng, lấy giá catalog, kiểm tồn kho (như hiện tại).
3. `now = now()` một lần; `subtotal` từ giá catalog.
4. Nếu có `couponCode`: `evaluateCoupon(findCoupon(code), subtotal, now)`; không hợp lệ → ném
   `OrderError` (bảng lỗi bên dưới), **không lưu đơn** (FR-019).
5. `calculateOrderTotals(items, shippingMethod, discount)`; lưu đơn kèm `couponCode` + `discount`.

## Response 201 — đơn hàng có hai trường mới

```json
{
  "id": "SL-20261108-4F9A2C",
  "status": "pending",
  "subtotal": 900000,
  "couponCode": "GIAM50K",
  "discount": 50000,
  "shippingFee": 0,
  "total": 850000
}
```

(rút gọn — các trường khác như hiện tại). Đơn không mã: `discount: 0`, không có `couponCode`.

## Lỗi mới

| Status | `code`                        | `details`                   |
| ------ | ----------------------------- | --------------------------- |
| 422    | `COUPON_NOT_FOUND`            | `{ "couponCode": message }` |
| 422    | `COUPON_EXPIRED`              | `{ "couponCode": message }` |
| 422    | `COUPON_MIN_SUBTOTAL_NOT_MET` | `{ "couponCode": message }` |

Message giống hệt [coupons-validate.md](./coupons-validate.md). Thêm vào `OrderErrorCode` và
`HTTP_STATUS_BY_CODE`.

## `GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id`

- Không đổi hình dạng; đơn có thể có thêm `couponCode?` và `discount?`.
- Đơn tạo trước tính năng không có hai trường này — client MUST coi `discount` thiếu là 0.
- `PATCH` (hủy đơn) giữ nguyên `couponCode`/`discount`.
