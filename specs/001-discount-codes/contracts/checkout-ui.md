# Contract: UI mã giảm giá (trang thanh toán và chi tiết đơn)

E2E và component test tìm phần tử theo nhãn tiếng Việt và `data-testid` dưới đây — đổi UI phải giữ
đồng bộ (AGENTS.md §6).

## Trang thanh toán — `CouponField` (nằm phía trên tóm tắt đơn hàng)

| Phần tử                   | Nhãn / tên truy cập      | `data-testid`    | Ghi chú                                                         |
| ------------------------- | ------------------------ | ---------------- | --------------------------------------------------------------- |
| Ô nhập mã                 | `<label>` "Mã giảm giá"  | `coupon-input`   | `aria-invalid` khi có lỗi, `aria-describedby` trỏ tới thông báo |
| Nút áp dụng               | "Áp dụng"                | `coupon-apply`   | `type="button"`; "Đang kiểm tra…" khi chờ API                   |
| Mã đang áp dụng           | text mã, ví dụ "GIAM50K" | `coupon-applied` | Thay cho ô nhập khi đã áp dụng (FR-014)                         |
| Nút gỡ                    | "Gỡ mã"                  | `coupon-remove`  | `type="button"`                                                 |
| Thông báo lỗi / tạm ngưng | –                        | `coupon-message` | `role="alert"`; câu chữ FR-007 / FR-008                         |

Hành vi:

- Ô trống / chỉ khoảng trắng + "Áp dụng" → "Vui lòng nhập mã giảm giá", không gọi API.
- Sửa nội dung ô nhập → xóa thông báo lỗi cũ.
- Enter trong ô mã → áp dụng mã, KHÔNG submit form đặt hàng.
- Trạng thái `suspended` / `blocked` ([data-model.md](../data-model.md)) → hiển thị thông báo tại
  `coupon-message`, nút "Đặt hàng" `disabled`.
- Ô mã không hiển thị khi giỏ rỗng (form đã hiện EmptyState).

## Tóm tắt đơn hàng — `CheckoutSummary`

| Dòng                               | `data-testid`     | Hiển thị khi                   |
| ---------------------------------- | ----------------- | ------------------------------ |
| Tạm tính                           | –                 | luôn                           |
| "Giảm giá (GIAM50K)" / "-50.000 ₫" | `discount-amount` | trạng thái `active`            |
| Phí giao hàng                      | `shipping-fee`    | luôn (không đổi)               |
| Tổng thanh toán                    | `checkout-total`  | luôn; = tạm tính − giảm + ship |

## Trang chi tiết đơn — `OrderTotals`

| Dòng                               | `data-testid`    | Hiển thị khi                      |
| ---------------------------------- | ---------------- | --------------------------------- |
| Tạm tính                           | –                | luôn                              |
| "Giảm giá (GIAM50K)" / "-50.000 ₫" | `order-discount` | `couponCode` có và `discount > 0` |
| Phí giao hàng                      | –                | luôn                              |
| Tổng cộng                          | –                | luôn — dùng `order.total` đã lưu  |
