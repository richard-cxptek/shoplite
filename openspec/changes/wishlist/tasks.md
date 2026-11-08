# Tasks

## 1. Lõi dữ liệu wishlist (reducer thuần)

- [x] 1.1 Tạo `src/features/wishlist/types.ts` gồm `WishlistState` (`{ productIds: string[] }`, mới nhất đứng đầu), `WishlistAction` (`toggle`, `remove`, `prune`, `clear`) và `ToggleResult` (`"added" | "removed" | "full"`). Kiểm tra: `npx tsc --noEmit` không báo lỗi.
- [x] 1.2 Tạo `src/features/wishlist/wishlist-reducer.ts`: `MAX_WISHLIST_ITEMS = 50`, `EMPTY_WISHLIST`, `wishlistReducer`, `normalizeWishlist` (bỏ trùng, cắt còn 50 mục mới nhất) và `getToggleResult(state, id)`. Khi không đổi gì (thêm khi đầy, prune không có id lạ, bỏ id không tồn tại), reducer phải trả lại đúng tham chiếu state cũ. Kiểm tra bằng test ở 1.3.
- [x] 1.3 Viết `src/features/wishlist/wishlist-reducer.test.ts` (tên test tiếng Việt), bao phủ: thêm vào đầu danh sách, bấm lần nữa để bỏ, không trùng lặp, thêm sản phẩm thứ 50, thêm khi đã 50 (state giữ nguyên tham chiếu, kết quả `"full"`), bỏ khi đầy, `prune` loại id lạ và giữ nguyên tham chiếu khi không có gì để loại, `normalizeWishlist` với dữ liệu trùng / quá 50. Kiểm tra: `npx vitest run src/features/wishlist/wishlist-reducer.test.ts` pass.

## 2. Lưu trữ trình duyệt và đồng bộ tab

- [x] 2.1 Tạo `src/features/wishlist/wishlist-store.ts` theo mẫu `cart-store.ts`: key `WISHLIST_STORAGE_KEY = "shoplite:wishlist"`; đọc dữ liệu, kiểm tra cấu trúc rồi `normalizeWishlist`; JSON hỏng hoặc sai cấu trúc → `EMPTY_WISHLIST`; ghi bọc `try/catch`; lắng nghe sự kiện `storage` theo key; `getServerSnapshot` trả rỗng; có `reset()` cho test. Kiểm tra bằng test ở 2.3.
- [x] 2.2 Tạo `src/features/wishlist/use-wishlist.ts`, dùng `useSyncExternalStore` + `useHydrated`, trả về `productIds`, `count`, `hydrated`, `isLiked`, `toggle` (trả `ToggleResult`), `remove`, `prune`. Kiểm tra: typecheck pass, hành vi được test qua component ở nhóm 3.
- [x] 2.3 Viết `src/features/wishlist/wishlist-store.test.ts`, bao phủ: ghi `localStorage` sau mỗi thay đổi, đọc lại sau `reset()` (mô phỏng tải lại trang), dữ liệu hỏng / sai cấu trúc → rỗng, dữ liệu trùng / quá 50 được chuẩn hóa, `setItem` ném lỗi vẫn cập nhật state trong phiên, sự kiện `storage` cùng key cập nhật state và gọi subscriber, sự kiện khác key bị bỏ qua, xóa key ở tab khác → rỗng, thêm khi đầy không ghi và không `emit`. Kiểm tra: `npx vitest run src/features/wishlist/wishlist-store.test.ts` pass.

## 3. Nút trái tim trên thẻ sản phẩm và trang chi tiết (catalog)

- [x] 3.1 Tạo `src/features/wishlist/components/wishlist-button.tsx` (`"use client"`) với `variant="icon" | "labeled"`. Nút có `aria-pressed`, `aria-label="Yêu thích {tên}"`, `data-testid="wishlist-button"`; icon `Heart` (`aria-hidden`) tô đầy khi đã thích; có `focus-visible`. Khi `toggle` trả `"full"`, hiện thông báo "Danh sách yêu thích đã đầy (tối đa 50 sản phẩm). Hãy bỏ bớt để thêm sản phẩm mới." trong vùng `role="status"` (`data-testid="wishlist-message"`), tự ẩn sau khoảng 4 giây và dọn timer khi unmount. Kiểm tra bằng test ở 3.4.
- [x] 3.2 Gắn `WishlistButton variant="icon"` vào `src/features/catalog/components/product-card.tsx` ở góc trên phải của ảnh, **ngoài** `<Link>` ảnh. `ProductCard` vẫn là Server Component. Kiểm tra: `npm run dev`, nút tim hiển thị trên thẻ ở `/products` và không che badge "-x%".
- [x] 3.3 Gắn `WishlistButton variant="labeled"` vào `src/app/products/[slug]/page.tsx` ở ngoài `ProductPurchasePanel`, để vẫn hiển thị khi sản phẩm hết hàng (p004). Kiểm tra: mở `/products/<slug của p004>`, nút "Yêu thích" vẫn hiển thị.
- [x] 3.4 Viết `src/features/wishlist/components/wishlist-button.test.tsx` và bổ sung `src/features/catalog/components/product-card.test.tsx` (gọi `wishlistStore.reset()` trong `beforeEach`), bao phủ: bấm để thích (`aria-pressed="true"`, store có id), bấm lần nữa để bỏ, thao tác bằng bàn phím (Enter/Space), tên truy cập chứa tên sản phẩm, thích được sản phẩm hết hàng p004, bấm tim không đổi giỏ hàng, nạp sẵn 50 id rồi bấm → thông báo đầy hiển thị và store giữ nguyên, trạng thái đã lưu được phản ánh khi render. Kiểm tra: `npx vitest run src/features/wishlist src/features/catalog` pass.

## 4. Chỉ báo ở header (layout)

- [x] 4.1 Tạo `src/features/wishlist/components/wishlist-badge.tsx` (`"use client"`, cùng mẫu với `CartBadge`): liên kết tới `/wishlist`, icon `Heart`, hiện số (`data-testid="wishlist-count"`) chỉ khi `hydrated && count > 0`, `aria-label` là "Danh sách yêu thích (N sản phẩm)" hoặc "Danh sách yêu thích". Kiểm tra bằng test ở 4.3.
- [x] 4.2 Thêm `WishlistBadge` vào `src/components/layout/header.tsx`, đặt trước `CartBadge` trong khối `ml-auto` (bọc `flex items-center sm:gap-1`). Để không tràn ở mobile: dưới `sm` ẩn link "Trang chủ" trong `src/components/layout/nav-links.tsx` và thu gọn khoảng cách (xem design D7). Kiểm tra: header hiển thị cả trái tim và giỏ hàng ở 320px, 375px, 640px, 1280px (đã đo bằng Playwright, header không tràn).
- [x] 4.3 Viết `src/features/wishlist/components/wishlist-badge.test.tsx`, bao phủ: danh sách rỗng → không có số, nhãn "Danh sách yêu thích"; có 3 sản phẩm → số "3" và nhãn chứa số; liên kết có `href="/wishlist"`; số cập nhật khi store thay đổi. Kiểm tra: `npx vitest run src/features/wishlist/components/wishlist-badge.test.tsx` pass.

## 5. Trang /wishlist

- [x] 5.1 Tạo `src/features/wishlist/components/wishlist-item-row.tsx`: dòng `data-testid="wishlist-item"` gồm `ProductImage`, tên là liên kết tới `/products/{slug}`, `PriceTag`, `StockBadge`, `AddToCartButton` (tự vô hiệu hóa khi hết hàng hoặc giỏ đã tối đa) và nút "Bỏ thích" (`aria-label="Bỏ thích {tên}"`). Kiểm tra bằng test ở 5.4.
- [x] 5.2 Tạo `src/features/wishlist/components/wishlist-view.tsx` (`"use client"`, nhận prop `products: Product[]`): skeleton khi chưa `hydrated`; ghép `productIds` với `products` theo thứ tự wishlist; `prune` id lạ trong `useEffect`; trạng thái trống bọc `data-testid="wishlist-empty"` với tiêu đề "Danh sách yêu thích đang trống" và liên kết "Khám phá sản phẩm" tới `/products`. Kiểm tra bằng test ở 5.4.
- [x] 5.3 Tạo `src/app/wishlist/page.tsx` (Server Component mỏng, `metadata.title = "Danh sách yêu thích"`, tiêu đề `h1`), truyền `getAllProducts()` vào `WishlistView`. Kiểm tra: `npm run dev`, mở `/wishlist` thấy trạng thái trống khi chưa thích gì.
- [x] 5.4 Viết `src/features/wishlist/components/wishlist-view.test.tsx`, bao phủ: skeleton trước khi hydrate (không hiện trạng thái trống); trạng thái trống có liên kết `/products`; thứ tự mới nhất đứng đầu; giá lấy từ prop `products` chứ không phải lúc thích (truyền product đã đổi giá); id lạ không hiển thị và bị loại khỏi store; "Bỏ thích" xóa dòng; bỏ sản phẩm cuối → trạng thái trống; "Thêm vào giỏ" thêm 1 vào `cartStore` và vẫn giữ trong wishlist; sản phẩm hết hàng p004 có nhãn "Hết hàng", nút giỏ bị vô hiệu hóa và vẫn bỏ thích được; giỏ đã tối đa → nút giỏ bị vô hiệu hóa. Kiểm tra: `npx vitest run src/features/wishlist/components/wishlist-view.test.tsx` pass.

## 6. E2E và tài liệu

- [x] 6.1 Cập nhật `AGENTS.md`: thêm dòng Wishlist (`src/features/wishlist/`: `wishlist-reducer.ts` (`MAX_WISHLIST_ITEMS`), `wishlist-store.ts` (`wishlistStore`, `WISHLIST_STORAGE_KEY`), `use-wishlist.ts`) vào Codemap; mục 7 đổi thành "không truy cập `localStorage` ngoài `cart-store.ts` và `wishlist-store.ts`"; mục 6 thêm các `data-testid` `wishlist-button`, `wishlist-count`, `wishlist-item`, `wishlist-message`, `wishlist-empty`. Kiểm tra: đọc lại diff `AGENTS.md`, chỉ có các thay đổi trên.
- [x] 6.2 Viết `e2e/wishlist.spec.ts`, bao phủ: thích từ thẻ sản phẩm → `wishlist-count` = 1; trạng thái giữ sau khi tải lại; trang chi tiết hiển thị "đã thích" rồi bỏ thích được; `/wishlist` liệt kê sản phẩm, "Thêm vào giỏ" làm tăng `cart-count`, "Bỏ thích" dẫn tới `wishlist-empty`; nạp sẵn 50 id bằng `addInitScript` → bấm tim hiện `wishlist-message`; mở 2 trang cùng `context`, thích ở trang A → `wishlist-count` ở trang B cập nhật. Kiểm tra: `npm run test:e2e` pass (kể cả `e2e/shopping-flow.spec.ts` hiện có).

## 7. Kiểm tra tổng thể

- [x] 7.1 Chạy `npm run format:check` (sửa bằng `npm run format` nếu cần), và kiểm tra `src/features/coupons/client-boundary.test.ts` vẫn pass với các Client Component mới. Kiểm tra: lệnh format sạch. **Ghi nhận (đã chốt với người dùng):** repo chưa có file cấu hình Prettier nên `npm run format:check` fail trên 121 file, phần lớn là file cũ, và không chạy `npm run format` toàn repo. Mọi file của change đã sạch theo style thực tế của repo (`--print-width 100 --plugin prettier-plugin-tailwindcss`). `client-boundary.test.ts` pass.
- [x] 7.2 Chạy `npm run check` (lint + typecheck + test) và phải pass.
