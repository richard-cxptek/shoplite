# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Tổng quan

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Zod 4 · Vitest + Testing Library · Playwright. Node >= 22.12.
- Sản phẩm/danh mục: dữ liệu tĩnh trong `src/data/products.ts`, `src/data/categories.ts`.
- Giỏ hàng: `localStorage` của trình duyệt, key `CART_STORAGE_KEY = "shoplite:cart"`.
- Đơn hàng: file JSON `ORDERS_FILE` (mặc định `DEFAULT_ORDERS_FILE` = `storage/orders.json`, đã gitignore, tự tạo khi ghi).
- Alias `@/*` → `src/*`.

## 2. Lệnh thường dùng

```bash
npm run dev                            # dev server (Turbopack), http://localhost:3000
npm run check                          # lint + typecheck + test (typecheck = next typegen && tsc --noEmit)
npx vitest run src/features/orders     # test một thư mục (hoặc một file)
npx vitest run -t "tên test"           # test theo tên
npm run test:e2e                       # Playwright, tự chạy `npm run dev` (lần đầu: npx playwright install chromium)
npm run format                         # Prettier + prettier-plugin-tailwindcss
```

## 3. Codemap

| Capability | Thư mục                                         | File quan trọng                                                                                                                                                                                                                                                                                                                              |
| ---------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog    | `src/features/catalog/`                         | `catalog-service.ts` (`parseCatalogQuery`, `queryProducts`, `buildCatalogHref`, `getProductById`, `PAGE_SIZE`, `LOW_STOCK_THRESHOLD`)                                                                                                                                                                                                        |
| Cart       | `src/features/cart/`                            | `cart-reducer.ts` (`cartReducer`, `MAX_QUANTITY_PER_ITEM`, `getMaxQuantity`), `cart-store.ts` (`cartStore`), `use-cart.ts` (`useCart`)                                                                                                                                                                                                       |
| Checkout   | `src/features/checkout/`                        | `pricing.ts` (`calculateOrderTotals`, `FREE_SHIPPING_THRESHOLD`, `SHIPPING_OPTIONS`), `checkout-schema.ts` (`checkoutFormSchema`, `placeOrderSchema`, `toFieldErrors`), `components/checkout-form.tsx`                                                                                                                                       |
| Orders     | `src/features/orders/`                          | `order-service.ts` (`createOrderService`), `order-repository.ts`, `order-errors.ts` (`OrderError`), `server.ts` (`orderService`)                                                                                                                                                                                                             |
| Coupons    | `src/features/coupons/` + `src/data/coupons.ts` | `coupon-rules.ts` (`evaluateCoupon`, `calculateDiscount`, `getCouponErrorMessage` — thuần, dùng được ở client), `coupon-service.ts` (`couponService`, `findCouponByCode` — chỉ server), `coupon-errors.ts` (`toCouponOrderError`), `applied-coupon-store.ts` (`appliedCouponStore`, `useAppliedCouponStatus`), `components/coupon-field.tsx` |
| Wishlist   | `src/features/wishlist/`                        | `wishlist-reducer.ts` (`wishlistReducer`, `MAX_WISHLIST_ITEMS`, `normalizeWishlist`), `wishlist-store.ts` (`wishlistStore`, `WISHLIST_STORAGE_KEY = "shoplite:wishlist"`), `use-wishlist.ts` (`useWishlist`), `components/wishlist-button.tsx`, `components/wishlist-view.tsx`                                                               |
| API        | `src/app/api/` + `src/lib/http.ts`              | `products/route.ts`, `products/[slug]/route.ts`, `orders/route.ts`, `orders/[id]/route.ts`, `coupons/validate/route.ts`; `handleRouteError`, `jsonError`, `readJsonBody`                                                                                                                                                                     |

**Luồng thêm vào giỏ hàng** (hoàn toàn phía client):
`ProductPurchasePanel` / `AddToCartButton` → `useCart().addItem(product, qty)` → `toCartItem(product)` → `cartStore.dispatch({ type: "add" })` → `cartReducer` (giới hạn bằng `getMaxQuantity`) → `writeToStorage` ghi `localStorage` → `emit()` cập nhật mọi component dùng `useSyncExternalStore` (kể cả tab khác qua sự kiện `storage`).

**Luồng áp dụng mã giảm giá**:
`CouponField` → `fetch("POST /api/coupons/validate")` gửi `{ couponCode, items }` → `couponService.check` (validate `checkCouponSchema`, tạm tính từ giá catalog, `evaluateCoupon`: tồn tại → còn hạn → đạt tối thiểu; lỗi qua `toCouponOrderError` với `details.couponCode`) → client lưu quy tắc mã vào `appliedCouponStore` (bộ nhớ, không `localStorage`) → `useAppliedCouponStatus(subtotal)` tính lại mỗi lần render: `active` / `suspended` (chưa đạt tối thiểu, tự hiệu lực lại) / `blocked` (server từ chối hoặc hết hạn, chỉ thoát bằng "Gỡ mã"); `suspended`/`blocked` khóa nút "Đặt hàng".

**Luồng đặt hàng**:
`CheckoutForm` validate bằng `checkoutFormSchema` → `fetch("POST /api/orders")` chỉ gửi `{ productId, quantity }` (+ `couponCode` khi mã đang `active`) → `app/api/orders/route.ts` (`readJsonBody`) → `orderService.placeOrder` (validate `placeOrderSchema`, `mergeItems` (tổng sau gộp ≤ `MAX_QUANTITY_PER_ITEM`), lấy giá qua `findProduct` = `getProductById`, kiểm tồn kho, kiểm tra lại mã bằng `evaluateCoupon` với một lần `now()`, `calculateOrderTotals(items, method, discount)`, `generateOrderId` dạng `SL-YYYYMMDD-XXXXXX`) → `repository.save` → `createJsonFileOrderRepository` ghi file `.tmp` rồi `rename`. Thành công: client gọi `clear()` + `appliedCouponStore.clear()` và chuyển tới `/orders/{id}?placed=1`. Lỗi: `handleRouteError` trả `{ error: { code, message, details? } }`; lỗi `COUPON_*` → `appliedCouponStore.markServerError` (mã chuyển sang `blocked`).

## 4. Quy ước code

- **Feature-based:** `src/app/` chỉ chứa page/layout/route handler mỏng; logic, component, type và test nằm trong `src/features/<feature>/`. UI dùng chung ở `src/components/`, tiện ích ở `src/lib/`.
- **Đặt tên file:** kebab-case (`cart-reducer.ts`, `add-to-cart-button.tsx`); test đặt cạnh file nguồn: `*.test.ts(x)`. Component export dạng named function PascalCase.
- **Server/Client Component:** mặc định là Server Component; chỉ thêm `"use client"` cho component cần state/hook/trình duyệt (ví dụ `checkout-form.tsx`, `cart-view.tsx`, `cancel-order-button.tsx`). Dữ liệu chỉ có ở client (giỏ hàng) phải chờ `hydrated` (`useHydrated`) trước khi render để tránh lệch hydrate. Trang đọc đơn hàng dùng `export const dynamic = "force-dynamic"`.
- **`orders/server.ts`** dùng `node:fs` → chỉ import từ Server Component / route handler, không import trong file `"use client"`.
- **Zod:** schema đặt trong feature (`checkout-schema.ts`), dùng `safeParse`, lỗi chuyển thành map phẳng `"customer.phone"` qua `toFieldErrors`. Type suy ra bằng `z.infer`.
- **Lỗi API:** lỗi nghiệp vụ ném `OrderError(code, message, details?)`; HTTP status lấy từ `HTTP_STATUS_BY_CODE`. Thêm mã lỗi mới = thêm vào `OrderErrorCode` + `HTTP_STATUS_BY_CODE`. Route handler bọc `try/catch` → `handleRouteError`; lỗi không xác định thành `500 INTERNAL_ERROR`.
- **Text tiếng Việt:** toàn bộ text UI, message lỗi, comment và tên test viết bằng tiếng Việt. Định dạng tiền/ngày qua `formatCurrency`, `formatDateTime` (`src/lib/format.ts`); tìm kiếm không dấu qua `normalizeText`.
- Ghép class Tailwind bằng `cn` (`src/lib/cn.ts`); nút dùng `Button` / `buttonStyles` (`src/components/ui/button.tsx`).

## 5. Quy tắc nghiệp vụ không được phá vỡ

- **Giỏ hàng:** mỗi sản phẩm tối đa `MAX_QUANTITY_PER_ITEM = 10` và không vượt `stock` (`getMaxQuantity`); sản phẩm `stock <= 0` không thêm được (reducer trả lại state cũ).
- **Phí ship** (`pricing.ts`): `standard` 30_000, `express` 60_000; `standard` miễn phí khi subtotal >= `FREE_SHIPPING_THRESHOLD = 500_000`; giỏ rỗng phí = 0. Client và server dùng chung các hàm này — không tính phí ở nơi khác.
- **Giá do server tính:** `placeOrder` lấy `unitPrice` từ catalog, `placeOrderSchema` chỉ nhận `productId` + `quantity` (và `couponCode` tùy chọn). Không bao giờ dùng giá/số tiền giảm/tổng tiền từ client.
- **Mã giảm giá:** loại `percent` (có `maxDiscount`) hoặc `fixed`; số tiền giảm làm tròn xuống đồng nguyên và không vượt tạm tính; `minSubtotal` so với tạm tính TRƯỚC giảm (≥ là đạt); `expiresOn` còn hiệu lực hết ngày theo giờ Việt Nam (UTC+7, theo đồng hồ server). Phí ship vẫn xét theo tạm tính trước giảm. Mỗi đơn tối đa một mã; mã không hợp lệ lúc đặt hàng → từ chối đơn (422), không tự tạo đơn không giảm. Đơn lưu `couponCode` + `discount`; đơn cũ thiếu hai trường = giảm 0đ.
- **Hủy đơn:** `cancelOrder` chỉ cho phép khi `status === "pending"`, ngược lại `INVALID_STATUS_TRANSITION` (409). `PATCH /api/orders/:id` chỉ chấp nhận body `{ "status": "cancelled" }`.

## 6. Testing

- Vitest chỉ chạy `src/**/*.test.{ts,tsx}`, môi trường mặc định `jsdom`; `vitest.setup.ts` gọi `cleanup()` và xóa `localStorage` sau mỗi test.
- Test code dùng file hệ thống / route handler: thêm dòng đầu `// @vitest-environment node`. Test repository JSON ghi vào thư mục tạm (`mkdtemp(tmpdir())`), xóa ở `afterEach` — xem `order-repository.test.ts`.
- **Repository in-memory:** test service dùng `createOrderService({ repository: createInMemoryOrderRepository(), now, generateId })` để cố định thời gian/mã đơn. Test route mock singleton:
  `vi.mock("@/features/orders/server", ...)` trả `orderService` dùng `createInMemoryOrderRepository()` (xem `src/app/api/orders/route.test.ts`).
- Test cart store: gọi `cartStore.reset()` để buộc đọc lại `localStorage`.
- E2E (`e2e/shopping-flow.spec.ts`, `e2e/wishlist.spec.ts`) tìm phần tử theo nhãn tiếng Việt và `data-testid` (`product-card`, `purchase-panel`, `cart-count`, `cart-total`, `order-row`, `coupon-input`, `coupon-apply`, `coupon-applied`, `coupon-remove`, `coupon-message`, `discount-amount`, `checkout-total`, `order-discount`, `wishlist-button`, `wishlist-count`, `wishlist-item`, `wishlist-message`, `wishlist-empty`) — đổi UI phải giữ đồng bộ.

## 7. Không được làm

- Không tin giá, phí ship, số tiền giảm hay tổng tiền gửi từ client; không thêm trường tiền vào `placeOrderSchema` (chỉ `couponCode`).
- Không đọc/ghi `storage/orders.json` trực tiếp — luôn đi qua `OrderRepository`.
- Không để unit test ghi vào `storage/` thật; dùng repository in-memory hoặc thư mục tạm.
- Không import `@/features/orders/server`, `@/data/coupons`, `@/features/coupons/coupon-service` hay `node:*` vào Client Component (có test `src/features/coupons/client-boundary.test.ts`).
- Không đặt logic nghiệp vụ trong `src/app/`; không truy cập `localStorage` ngoài `cart-store.ts` và `wishlist-store.ts`.
- Không trả lỗi API ngoài định dạng `{ error: { code, message, details? } }`.
- Không bật lại `agentRules` trong `next.config.ts` (đang `false` để `next dev` không sửa `AGENTS.md`).
- Không commit `.env*`, `storage/`, `coverage/`, `playwright-report/`, `test-results/`.

## 8. Definition of Done

- `npm run check` pass (lint + typecheck + test), và `npm run format:check` sạch.
- Logic mới có test đặt cạnh file nguồn; quy tắc ở mục 5 có test bảo vệ nếu bị chạm tới.
- Đổi luồng mua hàng/đặt hàng/UI có `data-testid` → chạy `npm run test:e2e`.
- Text mới bằng tiếng Việt; lỗi API mới có mã trong `OrderErrorCode` + `HTTP_STATUS_BY_CODE`.
