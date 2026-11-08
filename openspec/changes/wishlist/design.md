# Design

## Context

- Động cơ và phạm vi: xem `proposal.md`. Hành vi chi tiết: xem `specs/wishlist/spec.md`.
- Catalog là dữ liệu tĩnh (`src/data/products.ts`, 16 sản phẩm), đọc qua `catalog-service.ts`. `ProductCard` và trang chi tiết `src/app/products/[slug]/page.tsx` là Server Component. Các phần tương tác (`AddToCartButton`, `ProductPurchasePanel`) là client island.
- Giỏ hàng có sẵn một mẫu store phía client đã chạy ổn định: `cart-store.ts` lưu `localStorage`, phát thay đổi qua `emit()`, đồng bộ giữa các tab bằng sự kiện `storage`, React đọc qua `useSyncExternalStore`, và chờ `useHydrated` trước khi render dữ liệu chỉ có ở client.
- `AGENTS.md` mục 7 hiện cấm truy cập `localStorage` ngoài `cart-store.ts`. Wishlist bắt buộc phải lưu trên trình duyệt nên quy tắc này cần được nới thêm đúng một file.
- Header (`src/components/layout/header.tsx`) là Server Component, nhúng `CartBadge` (client).

## Goals / Non-Goals

**Goals:**

- Tạo feature `wishlist` độc lập, theo đúng mẫu của cart (reducer thuần + store + hook), để test được từng tầng.
- Không sửa logic giỏ hàng. Dùng lại `AddToCartButton` để tự động tuân theo `getMaxQuantity` và quy tắc hết hàng.
- Không thêm API hay dependency mới.

**Non-Goals:**

- Không gộp store của cart và wishlist vào một tiện ích `localStorage` dùng chung trong change này.
- Không thêm hành vi server nào cho wishlist.

## Decisions

### D1. Cấu trúc feature: reducer thuần + store + hook, sao chép mẫu của cart

- `wishlist-reducer.ts` thuần, chạy được cả ở server và client. Hằng `MAX_WISHLIST_ITEMS = 50`. Các action: `toggle`, `remove`, `prune(knownIds)`, `clear`, cùng hàm `normalizeWishlist` (bỏ trùng, cắt còn 50 mục mới nhất). Khi không có gì thay đổi, reducer trả lại **đúng tham chiếu state cũ** (ví dụ: thêm khi đã đầy, prune mà không có id lạ). Nhờ vậy store không ghi và không `emit`, giống `cartReducer` với sản phẩm `stock <= 0`.
- `wishlist-store.ts`: key `WISHLIST_STORAGE_KEY = "shoplite:wishlist"`. Store kiểm tra cấu trúc dữ liệu đọc lên rồi chạy `normalizeWishlist`. Ghi được bọc `try/catch` để vẫn chạy trong phiên khi trình duyệt chặn lưu trữ. Store lắng nghe sự kiện `storage` theo key và có `reset()` dùng cho test.
- `use-wishlist.ts`: trả về `productIds`, `count`, `hydrated`, `isLiked(id)`, `toggle(id)`, `remove(id)`, `prune(ids)`.
- **Phương án đã cân nhắc:** viết `createLocalStorageStore<T>()` dùng chung trong `src/lib/`, rồi refactor `cart-store.ts` theo nó. Bác bỏ vì phải chạm vào luồng giỏ hàng đang ổn định và mở rộng phạm vi test. Có thể làm sau như một change refactor riêng.

### D2. Dữ liệu lưu: chỉ lưu id, mới nhất đứng đầu

- Hình dạng: `{ "productIds": string[] }`, phần tử 0 là sản phẩm thích gần nhất. Không lưu giá, tồn kho hay tên. Đây là cách đáp ứng yêu cầu "số liệu luôn mới nhất" ngay từ dữ liệu.
- **Phương án đã cân nhắc:** lưu snapshot sản phẩm giống `CartItem`. Bác bỏ vì sẽ hiển thị giá/tồn kho cũ, đúng điều spec cấm.
- **Phương án đã cân nhắc:** lưu thêm `addedAt`. Chưa cần, vì thứ tự mảng đã đủ để sắp xếp. Thêm trường sau vẫn tương thích ngược nhờ bước kiểm tra cấu trúc.

### D3. Trang `/wishlist` lấy dữ liệu sản phẩm từ server render

- `src/app/wishlist/page.tsx` (Server Component mỏng) gọi `getAllProducts()` rồi truyền xuống `WishlistView` (client). `WishlistView` ghép `productIds` với danh sách sản phẩm theo id và giữ thứ tự của wishlist.
- **Phương án đã cân nhắc:** client gọi API mới `GET /api/products?ids=...`. Bác bỏ ở quy mô hiện tại vì thêm API, trạng thái loading và một vòng mạng, trong khi catalog chỉ có 16 sản phẩm tĩnh.
- **Phương án đã cân nhắc:** import `@/data/products` trực tiếp trong Client Component. Bác bỏ vì làm mờ ranh giới "dữ liệu đi qua `catalog-service`" và nhúng catalog vào bundle client ở mọi nơi dùng hook.

### D4. Loại id không còn trong catalog

- Sau khi `hydrated`, `WishlistView` tính các id không có trong danh sách sản phẩm và gọi `prune(knownIds)` trong `useEffect`. Reducer trả về state cũ nếu không có gì để loại, nên không tạo vòng render vô hạn. Số đếm ở header tự cập nhật qua store.
- Header không tự kiểm tra id với catalog, vì phải truyền catalog vào mọi trang. Nếu dữ liệu bị sửa tay, số đếm có thể lệch tạm thời cho tới khi khách mở `/wishlist`, và điều này chấp nhận được.

### D5. Thông báo "danh sách đầy"

- `toggle(id)` trả về `"added" | "removed" | "full"`, tính từ snapshot hiện tại trước khi dispatch. `WishlistButton` nhận `"full"` thì hiển thị thông báo trong vùng `role="status"` (`aria-live="polite"`, `data-testid="wishlist-message"`) gắn với nút, tự ẩn sau khoảng 4 giây (dọn timer khi unmount, giống `AddToCartButton`).
- Nút **không** bị vô hiệu hóa khi đầy. Khách vẫn bấm được và nhận phản hồi, và việc bỏ thích luôn hoạt động.
- **Phương án đã cân nhắc:** toast toàn cục. Bác bỏ vì dự án chưa có hệ thống toast, và thêm một hệ thống như vậy vượt phạm vi change.

### D6. Nút trái tim và khả năng truy cập

- `<button type="button" aria-pressed={liked} aria-label={`Yêu thích ${product.name}`} data-testid="wishlist-button">`. Icon `Heart` của `lucide-react` có `aria-hidden`. Khi đã thích, icon tô `fill-current text-rose-600`. Khi chưa thích, icon chỉ có viền `text-slate-500`. Có `focus-visible` ring. Tên truy cập cố định, trạng thái truyền qua `aria-pressed`.
- Hai biến thể: `variant="icon"` (thẻ sản phẩm, nút tròn đặt góc trên phải của ảnh, **nằm ngoài** `<Link>` ảnh để tránh lồng phần tử tương tác) và `variant="labeled"` (trang chi tiết, có chữ "Yêu thích" cố định). Tên truy cập vẫn chứa chữ hiển thị để đáp ứng WCAG 2.5.3.
- Hydrate: `getServerSnapshot` trả danh sách rỗng, nên lần render đầu luôn ở trạng thái "chưa thích". Cách này giống cart nên không lệch hydrate.

### D7. Điểm gắn UI

- `ProductCard` vẫn là Server Component và chỉ nhúng thêm `WishlistButton` (client island).
- Trang chi tiết: đặt `WishlistButton variant="labeled"` **ngoài** `ProductPurchasePanel`, vì panel đó trả về đoạn thông báo thay cho nút khi hết hàng, mà spec yêu cầu vẫn thích được sản phẩm hết hàng.
- Header: thêm `WishlistBadge` (client, cùng mẫu với `CartBadge`, `data-testid="wishlist-count"`, nhãn `Danh sách yêu thích (N sản phẩm)`) đứng trước `CartBadge` trong khối `ml-auto`. Thêm icon khiến header tràn ở màn hình hẹp (375px: nội dung 407px, icon giỏ bị đẩy ra ngoài). Đã chốt với người dùng: dưới `sm` (640px) ẩn link "Trang chủ" trong `NavLinks` (logo vẫn dẫn về `/`) và thu gọn khoảng cách nav/header, nên header vừa cả 320px. Từ `sm` trở lên không đổi. Phương án nav cuộn ngang bị loại vì "Đơn hàng" bị cắt.
- Trang `/wishlist`: skeleton khi chưa `hydrated`. Trạng thái trống dùng `EmptyState` bọc `data-testid="wishlist-empty"`, có liên kết "Khám phá sản phẩm" tới `/products` với `buttonStyles()`. Mỗi dòng (`data-testid="wishlist-item"`) dùng lại `ProductImage`, `PriceTag`, `StockBadge`, `AddToCartButton` và nút "Bỏ thích" (`aria-label="Bỏ thích {tên}"`).

### D8. Danh sách file theo capability

**wishlist (mới):**

- `src/features/wishlist/types.ts`: `WishlistState`, `WishlistAction`, `ToggleResult`
- `src/features/wishlist/wishlist-reducer.ts` + `src/features/wishlist/wishlist-reducer.test.ts`
- `src/features/wishlist/wishlist-store.ts` + `src/features/wishlist/wishlist-store.test.ts`
- `src/features/wishlist/use-wishlist.ts`
- `src/features/wishlist/components/wishlist-button.tsx` + `src/features/wishlist/components/wishlist-button.test.tsx`
- `src/features/wishlist/components/wishlist-badge.tsx` + `src/features/wishlist/components/wishlist-badge.test.tsx`
- `src/features/wishlist/components/wishlist-item-row.tsx`
- `src/features/wishlist/components/wishlist-view.tsx` + `src/features/wishlist/components/wishlist-view.test.tsx`
- `src/app/wishlist/page.tsx`: route mỏng, `metadata.title = "Danh sách yêu thích"`

**catalog (sửa):**

- `src/features/catalog/components/product-card.tsx`: thêm `WishlistButton variant="icon"`
- `src/features/catalog/components/product-card.test.tsx`: thêm test nút tim
- `src/app/products/[slug]/page.tsx`: thêm `WishlistButton variant="labeled"`

**layout (sửa):**

- `src/components/layout/header.tsx`: thêm `WishlistBadge`, thu gọn khoảng cách ở mobile
- `src/components/layout/nav-links.tsx`: ẩn "Trang chủ" dưới `sm`, giảm padding link ở mobile

**cart, checkout, orders:** không sửa. Chỉ dùng lại `AddToCartButton` và `useCart` từ `src/features/cart/`.

**E2E và tài liệu:**

- `e2e/wishlist.spec.ts` (mới): thích/bỏ thích, header, `/wishlist`, thêm vào giỏ, đầy 50 (nạp sẵn `localStorage` bằng `addInitScript`), đồng bộ 2 tab trong cùng `context`
- `AGENTS.md` (sửa): thêm dòng Wishlist vào Codemap; mục 7 cho phép `localStorage` trong `cart-store.ts` **và** `wishlist-store.ts`; mục 6 thêm `wishlist-button`, `wishlist-count`, `wishlist-item`, `wishlist-message`, `wishlist-empty`

## Risks / Trade-offs

- [Trang `/wishlist` truyền toàn bộ catalog xuống client] → Chấp nhận vì catalog có 16 sản phẩm. Khi catalog lớn hoặc chuyển sang nguồn động, đổi sang API theo `ids` hoặc chỉ truyền các trường cần hiển thị. Nếu khi đó dữ liệu catalog trở nên động, trang cần `dynamic = "force-dynamic"` để giá/tồn kho luôn mới.
- [Hai store `localStorage` gần giống nhau, trùng lặp code] → Chấp nhận để không chạm vào cart. Ghi nhận cho một change refactor sau (D1).
- [Số đếm ở header có thể tính cả id rác cho tới khi mở `/wishlist`] → Chỉ xảy ra khi dữ liệu bị sửa tay hoặc sản phẩm bị gỡ khỏi catalog. Được dọn tự động ở `/wishlist` (D4).
- [Nút tim nằm đè trên ảnh, có thể che badge "-x%"] → Badge giảm giá ở góc trên trái, nút tim ở góc trên phải.
- [Nới quy tắc `localStorage` trong `AGENTS.md`] → Chỉ thêm đúng một file. Quy tắc vẫn cấm truy cập ở mọi nơi khác.

## Migration Plan

- Không có dữ liệu cũ cần chuyển đổi. Key `shoplite:wishlist` mới hoàn toàn, khách đang có giỏ hàng không bị ảnh hưởng.
- Rollback: gỡ các điểm gắn UI (card, trang chi tiết, header) và route `/wishlist`. Key `localStorage` còn sót lại vô hại.
