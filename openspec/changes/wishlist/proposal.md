# Proposal

## Why

Khách thường xem nhiều sản phẩm nhưng chưa mua ngay. Hiện ShopLite chỉ có giỏ hàng, nên khách phải bỏ tạm sản phẩm vào giỏ, khiến giỏ lẫn giữa "sẽ mua" và "đang cân nhắc". Danh sách yêu thích cho khách một chỗ riêng để lưu sản phẩm, quay lại so sánh rồi mua sau.

## What Changes

- Thêm nút trái tim bật/tắt "yêu thích" trên thẻ sản phẩm (`ProductCard`) và ở trang chi tiết sản phẩm. Bấm lần nữa để bỏ thích. Trạng thái "đã thích" nhìn thấy rõ (tim tô đầy) và screen reader đọc được (`aria-pressed`).
- Header có biểu tượng trái tim kèm số lượng sản phẩm yêu thích, bấm vào mở trang `/wishlist`.
- Thêm trang `/wishlist`, liệt kê các sản phẩm đã thích với giá và tồn kho lấy từ catalog lúc hiển thị (không dùng bản sao lưu lúc thích). Mỗi sản phẩm có nút "Bỏ thích" và nút "Thêm vào giỏ". Khi danh sách trống thì hiện lời mời khám phá sản phẩm.
- Danh sách lưu trong `localStorage` của trình duyệt (chỉ lưu mã sản phẩm), không cần đăng nhập. Danh sách giữ nguyên khi tải lại trang và đồng bộ giữa các tab đang mở.
- Mỗi danh sách tối đa 50 sản phẩm. Khi đầy, nếu khách thích thêm thì danh sách không đổi và khách nhận được thông báo.
- Sản phẩm hết hàng vẫn nằm trong danh sách, hiển thị "Hết hàng" và không thêm vào giỏ được.
- Cập nhật `AGENTS.md`: cho phép truy cập `localStorage` trong store wishlist (hiện quy tắc chỉ cho phép ở `cart-store.ts`), thêm dòng Wishlist vào Codemap và thêm các `data-testid` mới vào danh sách E2E.

## Ngoài phạm vi

- Lưu wishlist lên server hoặc đồng bộ giữa các thiết bị/trình duyệt khác nhau.
- Chia sẻ wishlist (link, mạng xã hội).
- Thông báo khi sản phẩm có hàng trở lại hoặc giảm giá.
- Tự động chuyển sản phẩm từ wishlist sang giỏ hàng, hoặc tự bỏ khỏi wishlist khi đã thêm vào giỏ / đặt hàng.
- Sắp xếp, lọc hay phân trang trong trang `/wishlist`.
- Thay đổi giỏ hàng, thanh toán, đơn hàng hay API hiện có.

## Capabilities

### New Capabilities

- `wishlist`: danh sách sản phẩm yêu thích phía client. Gồm thêm/bỏ thích, giới hạn số lượng, lưu trữ và đồng bộ giữa các tab, chỉ báo ở header và trang `/wishlist` (hiển thị số liệu mới nhất, thêm vào giỏ, trạng thái trống, hết hàng).

### Modified Capabilities

(Không có. `openspec/specs/` hiện chưa có spec nào. Hành vi giỏ hàng/catalog không đổi, chỉ thêm điểm đặt nút trên UI.)

## Impact

- **Code mới:** `src/features/wishlist/` (reducer, store `localStorage`, hook, component nút tim / badge / trang danh sách và test), `src/app/wishlist/page.tsx`.
- **Code sửa:** `src/features/catalog/components/product-card.tsx`, `src/app/products/[slug]/page.tsx`, `src/components/layout/header.tsx`.
- **Lưu trữ trình duyệt:** key `localStorage` mới `shoplite:wishlist`.
- **Kiểm thử:** unit test mới cạnh file nguồn; bổ sung test `product-card.test.tsx`; thêm kịch bản E2E và `data-testid` mới (`wishlist-button`, `wishlist-count`, `wishlist-item`, `wishlist-message`, `wishlist-empty`).
- **Tài liệu:** `AGENTS.md` (Codemap, quy tắc `localStorage`, danh sách `data-testid`).
- **Không ảnh hưởng:** API `/api/*`, `placeOrderSchema`, tính giá/phí ship, dữ liệu đơn hàng. Không thêm dependency (dùng icon `Heart` của `lucide-react` đã có).
