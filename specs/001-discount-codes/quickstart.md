# Quickstart: kiểm chứng tính năng mã giảm giá

## Chuẩn bị

```bash
git switch -c 001-discount-codes   # nếu chưa ở nhánh tính năng
npm install
npm run check                      # lint + typecheck + test phải pass
npm run dev                        # http://localhost:3000
```

Giá dùng trong kịch bản (từ `src/data/products.ts`): `p006` Chuột không dây SwiftClick 450.000 ₫,
`p007` Bàn di chuột DeskMat XL 250.000 ₫, `p010` Cáp USB-C 150.000 ₫, `p003` Tai nghe StudioOne
2.450.000 ₫. Hôm nay (sau 28/02/2026) `TET2026` đã hết hạn.

## 1. Kiểm tra tự động

```bash
npx vitest run src/features/coupons src/features/checkout src/features/orders
npx vitest run src/app/api/coupons src/app/api/orders
npm run test:e2e                   # gồm e2e/shopping-flow.spec.ts (kịch bản SHOPLITE10)
npm run format:check
```

Kỳ vọng: toàn bộ pass; các giá trị biên liệt kê ở [research.md §9](./research.md) đều có test.

## 2. API (curl)

| #   | Body                                                                        | Kỳ vọng                                                                    |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A1  | `{"couponCode":" shoplite10 ","items":[{"productId":"p010","quantity":2}]}` | 200, `coupon.code` = `SHOPLITE10`, `subtotal` 300000, `discount` 30000     |
| A2  | `{"couponCode":"SHOPLITE10","items":[{"productId":"p003","quantity":1}]}`   | 200, `discount` 100000 (chạm trần)                                         |
| A3  | `{"couponCode":"GIAM50K","items":[{"productId":"p006","quantity":1}]}`      | 422 `COUPON_MIN_SUBTOTAL_NOT_MET`, message có "Mua thêm 50.000 ₫"          |
| A4  | `{"couponCode":"TET2026","items":[{"productId":"p006","quantity":1}]}`      | 422 `COUPON_EXPIRED`                                                       |
| A5  | `{"couponCode":"KHONGCO","items":[{"productId":"p006","quantity":1}]}`      | 422 `COUPON_NOT_FOUND`                                                     |
| A6  | `{"couponCode":"   ","items":[{"productId":"p006","quantity":1}]}`          | 400 `VALIDATION_ERROR`, `details.couponCode` = "Vui lòng nhập mã giảm giá" |

Gửi tới `POST /api/coupons/validate` ([contract](./contracts/coupons-validate.md)).

Đặt hàng `POST /api/orders` ([contract](./contracts/orders-post.md)):

| #   | Thay đổi so với body mẫu trong README                   | Kỳ vọng                                                                                           |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| O1  | `items` p006×1 + p010×1, `"couponCode":"giam50k"`       | 201, `couponCode` `GIAM50K`, `subtotal` 600000, `discount` 50000, `shippingFee` 0, `total` 550000 |
| O2  | như O1 + `"discount": 600000, "total": 0`               | 201, kết quả giống O1 (số liệu client bị bỏ qua)                                                  |
| O3  | `items` p007×2, `"couponCode":"SHOPLITE10"`, `standard` | 201, `discount` 50000, `shippingFee` 0 (xét tạm tính trước giảm), `total` 450000                  |
| O4  | `"couponCode":"TET2026"`                                | 422 `COUPON_EXPIRED`; `GET /api/orders` không có đơn mới                                          |
| O5  | không có `couponCode`                                   | 201, `discount` 0, không có `couponCode` (như trước)                                              |

## 3. Thủ công trên trình duyệt

1. Thêm `p006` + `p010` vào giỏ → `/checkout`. Nhập `giam50k`, bấm "Áp dụng" → tóm tắt có
   "Giảm giá (GIAM50K) -50.000 ₫", tổng 550.000 ₫, ô nhập được thay bằng mã + "Gỡ mã".
2. Bấm "Gỡ mã" → tổng về 600.000 ₫. Áp dụng lại `GIAM50K`.
3. Bấm link "Giỏ hàng" trên header (điều hướng trong app — gõ URL/tải lại trang sẽ mất mã), xóa `p010` → quay lại `/checkout`: mã vẫn hiện, giảm 0 ₫, thông báo "Mua thêm
   50.000 ₫", nút "Đặt hàng" bị khóa (Clarification Q2).
4. Thêm lại `p010` → quay lại `/checkout`: mã tự có hiệu lực lại, không cần nhập lại.
5. Nhập `TET2026` (sau khi gỡ mã) → "Mã giảm giá đã hết hạn"; sửa ô nhập → thông báo biến mất.
6. Bấm "Áp dụng" khi ô trống → "Vui lòng nhập mã giảm giá".
7. Đặt hàng với `GIAM50K` → trang chi tiết đơn có "Giảm giá (GIAM50K) -50.000 ₫", tổng khớp.
8. Mở một đơn cũ (tạo trước tính năng) → không có dòng giảm giá, số tiền như cũ, vẫn hủy được.
9. Kiểm tra bàn phím: Tab tới ô mã, Enter áp dụng mã (không submit form), Tab tới "Gỡ mã".

**Mô phỏng mã hết hạn lúc đặt hàng (Q1)**: tạm sửa `expiresOn` của một mã trong
`src/data/coupons.ts` thành ngày hôm qua sau khi đã áp dụng (dev server tự reload module server),
bấm "Đặt hàng" → đơn không được tạo, mã vẫn hiện kèm "Mã giảm giá đã hết hạn", thông tin form giữ
nguyên, nút "Đặt hàng" khóa cho tới khi bấm "Gỡ mã". Hoàn tác thay đổi sau khi thử. Kịch bản này
được phủ tự động bằng unit test với `now` cố định.
