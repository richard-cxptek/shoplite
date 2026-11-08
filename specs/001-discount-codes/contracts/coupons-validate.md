# Contract: `POST /api/coupons/validate` (mới)

Kiểm tra một mã giảm giá cho giỏ hàng hiện tại, dùng khi khách bấm "Áp dụng". Chỉ để hiển thị;
không tạo/ghi gì. Khi đặt hàng, server kiểm tra lại độc lập (xem [orders-post.md](./orders-post.md)).

Route handler: `src/app/api/coupons/validate/route.ts` → `couponService.check(body)`.

## Request

```json
{
  "couponCode": " giam50k ",
  "items": [{ "productId": "p006", "quantity": 2 }]
}
```

| Trường       | Quy tắc                                                                               |
| ------------ | ------------------------------------------------------------------------------------- |
| `couponCode` | string, trim, không phân biệt hoa thường, 1 – 32 ký tự                                |
| `items`      | giống `items` của `POST /api/orders`: ≥ 1 dòng, `productId` string, `quantity` 1 – 10 |

Mọi trường khác (ví dụ `subtotal`, `discount`) bị bỏ qua. Tạm tính luôn tính từ giá catalog.

## Response 200

```json
{
  "coupon": {
    "code": "GIAM50K",
    "type": "fixed",
    "amount": 50000,
    "minSubtotal": 500000
  },
  "subtotal": 900000,
  "discount": 50000
}
```

`coupon` là `PublicCoupon` ([data-model.md](../data-model.md)); client lưu để tự tính lại khi giỏ
đổi.

## Lỗi — định dạng chuẩn `{ "error": { "code", "message", "details"? } }`

| Status | `code`                        | `message` (ví dụ)                                                                                   | `details`                                         |
| ------ | ----------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 400    | `VALIDATION_ERROR`            | "Body phải là JSON hợp lệ" / "Thông tin mã giảm giá không hợp lệ"                                   | `{ "couponCode": "Vui lòng nhập mã giảm giá" }` … |
| 422    | `COUPON_NOT_FOUND`            | "Mã giảm giá không tồn tại"                                                                         | `{ "couponCode": message }`                       |
| 422    | `COUPON_EXPIRED`              | "Mã giảm giá đã hết hạn"                                                                            | `{ "couponCode": message }`                       |
| 422    | `COUPON_MIN_SUBTOTAL_NOT_MET` | "Đơn hàng chưa đạt giá trị tối thiểu 500.000 ₫ để dùng mã này. Mua thêm 50.000 ₫ để được giảm giá." | `{ "couponCode": message }`                       |
| 422    | `PRODUCT_NOT_FOUND`           | `Không tìm thấy sản phẩm "..."`                                                                     | –                                                 |

Thứ tự kiểm tra: body hợp lệ → sản phẩm tồn tại → mã tồn tại → còn hạn → đạt tối thiểu.
Không kiểm tra tồn kho ở đây (đã có ở bước đặt hàng).

## Ví dụ

```bash
curl -X POST http://localhost:3000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{ "couponCode": "GIAM50K", "items": [{ "productId": "p006", "quantity": 1 }] }'
# → 422 COUPON_MIN_SUBTOTAL_NOT_MET (p006 = 450.000 ₫, cần mua thêm 50.000 ₫)
```
