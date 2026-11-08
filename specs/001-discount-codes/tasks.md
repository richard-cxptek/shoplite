---
description: "Task list cho tính năng mã giảm giá khi thanh toán"
---

# Tasks: Mã giảm giá khi thanh toán

**Input**: Design documents from `/specs/001-discount-codes/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: BẮT BUỘC (constitution II + yêu cầu TDD). Trong mỗi phase, task viết test đứng TRƯỚC task
cài đặt; chạy `npx vitest run <file>` và xác nhận test FAIL rồi mới cài đặt. Test đặt cạnh file nguồn
(`*.test.ts(x)`); test route/service/file hệ thống có dòng đầu `// @vitest-environment node`; test
service dùng `createInMemoryOrderRepository()` và cố định `now` / `generateId`; tên test và message
bằng tiếng Việt. Tiền mong đợi trong test dựng bằng `formatCurrency(...)` (output `vi-VN` chứa
khoảng trắng không ngắt trước "₫").

**Organization**: Theo user story, thứ tự ưu tiên P1 (US1, US5) → P2 (US2, US3) → P3 (US4). Task cuối
của mỗi phase là `npm run check`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: US1 – US5 theo spec.md

## Path Conventions

Một project Next.js; alias `@/*` → `src/*`. Logic ở `src/features/<feature>/`, `src/app/` chỉ là
page/route mỏng (constitution I).

---

## Phase 1: Setup

**Purpose**: Nhánh riêng, đồng bộ tài liệu với các quyết định từ checklist bảo mật, baseline xanh

- [x] T001 Tạo nhánh tính năng `git switch -c 001-discount-codes` từ trạng thái hiện tại và xác nhận bằng `git branch --show-current` (constitution: mỗi tính năng một nhánh riêng)
- [x] T002 [P] Thống nhất khóa lỗi theo trường (security CHK021): đổi field request `code` → `couponCode` của `POST /api/coupons/validate` trong specs/001-discount-codes/contracts/coupons-validate.md, specs/001-discount-codes/data-model.md (mục `checkCouponSchema`) và bảng A1–A6 của specs/001-discount-codes/quickstart.md, để mọi lỗi liên quan tới mã đều nằm ở `details.couponCode`; đồng thời đổi `e2e/coupon-flow.spec.ts` → `e2e/shopping-flow.spec.ts` trong specs/001-discount-codes/plan.md và quickstart.md
- [x] T003 Chạy `npm run check` để có baseline xanh trước khi sửa code

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Kiểu dữ liệu, mã lỗi, quy tắc tính tiền thuần và dữ liệu mã — mọi user story đều cần

**⚠️ CRITICAL**: Không bắt đầu user story nào trước khi phase này xong

- [x] T004 [P] Định nghĩa kiểu trong src/features/coupons/types.ts: `Coupon` là union phân biệt theo `type` — chung: `code: string` ("Duy nhất, chữ in hoa, `[A-Z0-9]{3,32}`"), `minSubtotal?: number` ("Tạm tính trước giảm phải `>=` giá trị này"), `expiresOn?: string` ("`YYYY-MM-DD`, ngày cuối còn hiệu lực theo giờ VN (+07:00)"); `type: "percent"` có `percent: number` ("Số nguyên 1 – 100") và `maxDiscount: number` ("> 0"); `type: "fixed"` có `amount: number` ("> 0"). Thêm `PublicCoupon` (= `Coupon`), `CouponInvalidReason = "not_found" | "expired" | "min_subtotal_not_met"`, và `CouponEvaluation` = `{ status: "valid", discount }` | `{ status: "invalid", reason: "not_found" | "expired" }` | `{ status: "invalid", reason: "min_subtotal_not_met", minSubtotal, shortfall }`; comment tiếng Việt
- [x] T005 [P] Thêm trường tùy chọn `couponCode?: string` (mã in hoa đã dùng) và `discount?: number` (số tiền giảm lúc đặt; đơn cũ thiếu = 0) vào `Order` trong src/features/orders/types.ts
- [x] T006 [P] Thêm `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_SUBTOTAL_NOT_MET` vào `OrderErrorCode` và map cả ba sang `422` trong `HTTP_STATUS_BY_CODE` tại src/features/orders/order-errors.ts
- [x] T007 [P] Viết test (FAIL trước) cho tham số giảm giá trong src/features/checkout/pricing.test.ts: không truyền `discount` → kết quả như cũ và có `discount: 0`; 520_000 + giảm 50_000, `standard` → `shippingFee` 0, `total` 470_000 (FR-011: phí ship xét tạm tính trước giảm); 500_000 + giảm 50_000 → `shippingFee` 0, `total` 450_000; 499_999 + giảm 49_999 → `shippingFee` 30_000; `discount` lớn hơn `subtotal` bị kẹp bằng `subtotal` (tổng = phí ship); `discount` âm bị kẹp về 0; giỏ rỗng → mọi giá trị 0
- [x] T008 Cài đặt `calculateOrderTotals(lines, method, discount = 0)` trả `{ subtotal, discount, shippingFee, total }` trong src/features/checkout/pricing.ts: kẹp `discount` vào `[0, subtotal]`, `shippingFee = calculateShippingFee(subtotal, method)` giữ nguyên, `total = subtotal − discount + shippingFee`; không import `coupons` (phụ thuộc T007)
- [x] T009 [P] Viết test (FAIL trước) cho quy tắc mã trong src/features/coupons/coupon-rules.test.ts, dùng fixture mã cục bộ (không import `@/data/coupons`): `normalizeCouponCode(" shoplite10 ")` → `"SHOPLITE10"`, `"   "` → `""`; percent 10%/trần 100_000/tối thiểu 300_000 tại 299_999 → `min_subtotal_not_met` với `shortfall` 1, tại 300_000 → 30_000, 333_335 → 33_333 (làm tròn xuống), 1_000_000 → 100_000, 1_000_001 → 100_000; fixed 50_000/tối thiểu 500_000 tại 499_999 → shortfall 1, tại 500_000 → 50_000; fixed 50_000 không tối thiểu tại tạm tính 30_000 → giảm 30_000 (không vượt tạm tính); `expiresOn: "2026-02-28"` với `now` `2026-02-28T23:59:59.999+07:00` → còn hạn, `2026-03-01T00:00:00+07:00` → `expired`; `undefined` → `not_found`; mã vừa hết hạn vừa chưa đạt tối thiểu → `expired` (thứ tự FR-006); `getCouponErrorMessage` trả đúng 3 câu FR-007 với tiền qua `formatCurrency`; `toPublicCoupon` giữ nguyên các trường quy tắc
- [x] T010 Cài đặt src/features/coupons/coupon-rules.ts (thuần, dùng được ở client — chỉ import `./types` và `@/lib/format`, KHÔNG import `@/data/coupons`): `normalizeCouponCode`, `isCouponExpired(coupon, now)` (hết hạn khi `now >= Date.parse(expiresOn + "T00:00:00+07:00") + 24h`), `calculateDiscount(coupon, subtotal)` (percent: `Math.min(Math.floor((subtotal * percent) / 100), maxDiscount)`; fixed: `amount`; cuối cùng `Math.min(raw, subtotal)`), `evaluateCoupon(coupon | undefined, subtotal, now)` theo thứ tự tồn tại → còn hạn → đạt tối thiểu, `getCouponErrorMessage(evaluation)`, `toPublicCoupon` (phụ thuộc T004, T009)
- [x] T011 [P] Viết test (FAIL trước) toàn vẹn dữ liệu trong src/data/coupons.test.ts: mã duy nhất; mọi `code` khớp `/^[A-Z0-9]{3,32}$/`; percent có `percent` nguyên 1 – 100 và `maxDiscount > 0`, fixed có `amount > 0`; `expiresOn` (nếu có) khớp `YYYY-MM-DD`; đúng ba mã FR-003: SHOPLITE10 (percent 10, maxDiscount 100_000, minSubtotal 300_000, không hết hạn), GIAM50K (fixed 50_000, minSubtotal 500_000, không hết hạn), TET2026 (percent 15, maxDiscount 200_000, không tối thiểu, expiresOn `2026-02-28`)
- [x] T012 Tạo src/data/coupons.ts export `COUPONS: Coupon[]` với ba mã FR-003 (comment: chỉ import từ server — xem `coupon-service.ts`) (phụ thuộc T004, T011)
- [x] T013 Chạy `npm run check` — phải pass

**Checkpoint**: Quy tắc tính tiền + dữ liệu mã sẵn sàng, mọi test cũ vẫn xanh

---

## Phase 3: User Story 1 - Áp dụng mã hợp lệ và đặt hàng với giá đã giảm (Priority: P1) 🎯 MVP

**Goal**: Khách nhập mã hợp lệ, thấy ngay số tiền giảm và tổng mới; đơn đặt ra lưu `couponCode` +
`discount` do server tính.

**Independent Test**: Giỏ `p010`×2 (300.000 ₫) → áp dụng `shoplite10` → tóm tắt "-30.000 ₫" → đặt
hàng → đơn có `couponCode: "SHOPLITE10"`, `discount: 30000`.

### Tests for User Story 1 ⚠️ (viết trước, xác nhận FAIL)

- [x] T014 [P] [US1] Test `couponCode` trong src/features/checkout/checkout-schema.test.ts: `placeOrderSchema` nhận `" shoplite10 "` → `"SHOPLITE10"`; `""` và `"   "` → `undefined` ("chuỗi rỗng sau trim coi như không có mã"); 33 ký tự → lỗi tại key `couponCode` ("tối đa 32 ký tự"); thiếu `couponCode` vẫn hợp lệ; các trường `discount`, `subtotal`, `total` trong input bị loại khỏi kết quả; `orderItemsSchema` được export và giữ quy tắc cũ (≥ 1 dòng, `quantity` 1 – 10)
- [x] T015 [P] [US1] Test luồng hợp lệ trong src/features/coupons/coupon-service.test.ts (`// @vitest-environment node`): `createCouponService({ findCoupon, findProduct, now }).check({ couponCode: " shoplite10 ", items: [{ productId: "p010", quantity: 2 }] })` → `{ coupon: { code: "SHOPLITE10", ... }, subtotal: 300000, discount: 30000 }`; `subtotal` lấy từ giá catalog, bỏ qua `subtotal`/`discount` client gửi; body thiếu/rỗng mã → `OrderError("VALIDATION_ERROR")` với `details.couponCode` = "Vui lòng nhập mã giảm giá"; `productId` không tồn tại → `PRODUCT_NOT_FOUND`
- [x] T016 [P] [US1] Test route src/app/api/coupons/validate/route.test.ts (`// @vitest-environment node`): 200 với `{ couponCode: "SHOPLITE10", items: [{ productId: "p010", quantity: 2 }] }` trả `discount` 30000; 400 `VALIDATION_ERROR` "Body phải là JSON hợp lệ" khi body không phải JSON
- [x] T017 [P] [US1] Test đặt hàng có mã trong src/features/orders/order-service.test.ts: `couponCode: "giam50k"`, items `p006`×1 + `p010`×1, `standard` → đơn lưu `couponCode: "GIAM50K"`, `subtotal` 600000, `discount` 50000, `shippingFee` 0, `total` 550000; `p007`×2 + `SHOPLITE10`, `standard` → `discount` 50000, `shippingFee` 0, `total` 450000 (FR-011); không có mã → `discount: 0`, không có `couponCode`; `couponCode: "KHONGCO"` → `OrderError("COUPON_NOT_FOUND")` và `repository.findAll()` rỗng (FR-019); các test cũ không đổi
- [x] T018 [P] [US1] Test store trong src/features/coupons/applied-coupon-store.test.ts: `apply(publicCoupon)` → snapshot chứa `coupon`; `clear()` → `null`; listener được gọi khi đổi; `getServerSnapshot()` luôn `null`; `reset()` dùng giữa các test; không đụng `localStorage`
- [x] T019 [P] [US1] Test component src/features/coupons/components/coupon-field.test.tsx (mock `fetch` bằng `vi.stubGlobal`): ô tìm được bằng `getByLabelText("Mã giảm giá")` (`data-testid="coupon-input"`); nhập `" shoplite10 "` + bấm "Áp dụng" → `POST /api/coupons/validate` với body `{ couponCode, items: [{ productId, quantity }] }`; nút hiện "Đang kiểm tra…" khi chờ; thành công → `coupon-applied` hiện "SHOPLITE10" thay cho ô nhập; Enter trong ô gọi áp dụng và KHÔNG submit form cha
- [x] T020 [P] [US1] Test tích hợp trong src/features/checkout/components/checkout-form.test.tsx: store có `SHOPLITE10`, giỏ `p010`×2 → `discount-amount` hiện "Giảm giá (SHOPLITE10)" và "-30.000 ₫", `checkout-total` = 300.000 − 30.000 + 30.000 = 300.000 ₫; submit gửi `couponCode: "SHOPLITE10"` và KHÔNG có trường tiền nào; không có mã → body không có `couponCode`

### Implementation for User Story 1

- [x] T021 [P] [US1] Trong src/features/checkout/checkout-schema.ts: tách và export `orderItemsSchema`; thêm vào `placeOrderSchema` trường `couponCode` tùy chọn — "trim, in hoa, tối đa 32 ký tự; chuỗi rỗng sau trim coi như không có mã" (message lỗi tiếng Việt); không thêm trường tiền (phụ thuộc T014)
- [x] T022 [US1] Tạo src/features/coupons/coupon-schema.ts: `checkCouponSchema = { couponCode: string (trim, min 1 "Vui lòng nhập mã giảm giá", max 32), items: orderItemsSchema }`; type qua `z.infer` (phụ thuộc T021)
- [x] T023 [US1] Tạo src/features/coupons/coupon-service.ts (chỉ server import): `createCouponService({ findCoupon, findProduct = getProductById, now })` với `findCoupon` mặc định tra `COUPONS` theo `normalizeCouponCode`; `check(input)` → `safeParse` (lỗi → `OrderError("VALIDATION_ERROR", "Thông tin mã giảm giá không hợp lệ", toFieldErrors(...))`), tính `subtotal` từ giá catalog bằng `calculateSubtotal` (sản phẩm thiếu → `PRODUCT_NOT_FOUND`), `evaluateCoupon`, hợp lệ → `{ coupon: toPublicCoupon(...), subtotal, discount }`; export singleton `couponService` (phụ thuộc T010, T012, T022)
- [x] T024 [US1] Tạo route mỏng src/app/api/coupons/validate/route.ts: `POST` → `readJsonBody` (undefined → `jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ")`) → `couponService.check(body)` → `NextResponse.json(result)`; `try/catch` → `handleRouteError` (phụ thuộc T023)
- [x] T025 [US1] Sửa `placeOrder` trong src/features/orders/order-service.ts: thêm dep `findCoupon?` (mặc định tra `COUPONS`); gọi `now()` MỘT lần dùng cho cả xét hạn và `createdAt`; tính `subtotal` từ `orderItems`; nếu có `couponCode` thì `evaluateCoupon(findCoupon(code), subtotal, now)`: `invalid` → ném `OrderError` (`not_found` → `COUPON_NOT_FOUND`, `expired` → `COUPON_EXPIRED`, `min_subtotal_not_met` → `COUPON_MIN_SUBTOTAL_NOT_MET`) với message `getCouponErrorMessage(...)` và `details: { couponCode: message }`, KHÔNG gọi `repository.save` (FR-019); `valid` → lấy `discount`; `...calculateOrderTotals(orderItems, shippingMethod, discount)`; lưu `couponCode` (in hoa) khi có mã (phụ thuộc T008, T010, T021)
- [x] T026 [P] [US1] Tạo src/features/coupons/applied-coupon-store.ts: store module-level `AppliedCouponState = null | { coupon: PublicCoupon }` với `apply`, `clear`, `reset`, `subscribe`, `getSnapshot`, `getServerSnapshot` (luôn `null`) và hook `useAppliedCoupon()` qua `useSyncExternalStore`; không dùng `localStorage`/`sessionStorage` (phụ thuộc T018)
- [x] T027 [US1] Tạo src/features/coupons/components/coupon-field.tsx (`"use client"`, chỉ import `coupon-rules`, `types`, `applied-coupon-store`): `<label htmlFor>` "Mã giảm giá" + input `coupon-input`, nút `type="button"` "Áp dụng" (`coupon-apply`, "Đang kiểm tra…" khi chờ), Enter áp dụng không submit form; gọi `POST /api/coupons/validate`; thành công → `apply(coupon)` và hiện mã ở `coupon-applied`; dùng `cn`/`Button` (phụ thuộc T019, T026)
- [x] T028 [P] [US1] Sửa src/features/checkout/components/checkout-summary.tsx: nhận prop `discount` và `couponCode?`; truyền `discount` vào `calculateOrderTotals`; khi `discount > 0` hiện dòng "Giảm giá ({MÃ})" giá trị `-${formatCurrency(discount)}` với `data-testid="discount-amount"`; giữ `shipping-fee`, `checkout-total` (phụ thuộc T008)
- [x] T029 [US1] Sửa src/features/checkout/components/checkout-form.tsx: render `<CouponField items={items} />` phía trên `CheckoutSummary`; tính `discount` bằng `evaluateCoupon(state.coupon, subtotal, new Date())` (chỉ khi valid); truyền vào summary; body `POST /api/orders` thêm `couponCode` khi mã đang hiệu lực, không gửi trường tiền (phụ thuộc T020, T027, T028)
- [x] T030 [US1] Chạy `npm run check` — phải pass

**Checkpoint**: Áp dụng mã hợp lệ và đặt hàng có giảm giá hoạt động độc lập (MVP)

> Ghi chú khi implement (2026-11-08): `toCouponOrderError` trong `src/features/coupons/coupon-errors.ts`
> (vốn thuộc T035) đã được tạo sớm ở Phase 3 vì `coupon-service.check` (T023) và `placeOrder` (T025) cùng
> cần nó; T015 có thêm case `KHONGCO` → `COUPON_NOT_FOUND`. T035 còn lại chỉ là xác nhận không trùng lặp.

---

## Phase 4: User Story 5 - Không thể gian lận số tiền giảm (Priority: P1)

**Goal**: Server bỏ qua mọi con số từ client, kiểm tra lại mã khi đặt hàng, từ chối đơn khi mã không
hợp lệ; client giữ mã ở trạng thái bị chặn (Clarification Q1).

**Independent Test**: Gửi `POST /api/orders` kèm `SHOPLITE10` và `discount`/`total` tự đặt → đơn lưu
số do server tính; gửi kèm `TET2026` sau 28/02/2026 → 422 `COUPON_EXPIRED`, không có đơn mới.

### Tests for User Story 5 ⚠️ (viết trước, xác nhận FAIL)

- [x] T031 [P] [US5] Test chống gian lận trong src/features/orders/order-service.test.ts: input thêm `discount: 600000, subtotal: 1, total: 0` → đơn lưu đúng số server tính; `TET2026` với `now` = `2026-03-01T00:00:00+07:00` → `OrderError("COUPON_EXPIRED")` và `repository.findAll()` rỗng; `now` = `2026-02-28T23:59:59.999+07:00` → tạo đơn có giảm; `KHONGCO` → `COUPON_NOT_FOUND`; `GIAM50K` với `p006`×1 → `COUPON_MIN_SUBTOTAL_NOT_MET`, `details.couponCode` chứa "Mua thêm" + `formatCurrency(50000)`; `now` chỉ được gọi một lần (spy) và `createdAt` = thời điểm đó; dòng trùng `[{ p006, 10 }, { p006, 1 }]` → `VALIDATION_ERROR` vì vượt `MAX_QUANTITY_PER_ITEM` sau khi gộp (FR-023). Lưu ý: các case `COUPON_*` đã được T025 cài đặt nên sẽ pass ngay (test hồi quy); hai case "`now` gọi một lần" và "dòng trùng" phải FAIL trước khi cài đặt
- [x] T032 [P] [US5] Test route src/app/api/orders/route.test.ts: dùng `vi.useFakeTimers()` + `vi.setSystemTime(new Date("2026-11-08T10:00:00+07:00"))`; `couponCode: "TET2026"` → 422 với body `{ error: { code: "COUPON_EXPIRED", message, details: { couponCode } } }` và `GET /api/orders` không có đơn mới; body có `couponCode: "SHOPLITE10"` + `discount: 999999` → 201 với `discount` do server tính
- [x] T033 [P] [US5] Test src/features/checkout/components/checkout-form.test.tsx: `POST /api/orders` trả 422 `COUPON_EXPIRED` → thông tin form giữ nguyên, `coupon-applied` vẫn hiện mã, `coupon-message` (`role="alert"`) = "Mã giảm giá đã hết hạn", nút "Đặt hàng" `disabled`; bấm "Gỡ mã" → nút bật lại và lần submit sau không có `couponCode`
- [x] T034 [P] [US5] Test src/features/coupons/applied-coupon-store.test.ts: `markServerError({ code, message })` → `getAppliedCouponStatus(state, subtotal, now)` = `blocked` bất kể tạm tính; `blocked` chỉ thoát bằng `clear()`

### Implementation for User Story 5

- [x] T035 [US5] Tách bảng ánh xạ lý do → mã lỗi thành hàm `toCouponOrderError(evaluation)` trong src/features/coupons/coupon-errors.ts (trả `OrderError` với message `getCouponErrorMessage(...)` và `details: { couponCode: message }`), dùng lại trong src/features/orders/order-service.ts; không đổi hành vi, mọi test US1/US5 vẫn xanh (phụ thuộc T031)
- [x] T036 [US5] Trong src/features/orders/order-service.ts (FR-023): sau `mergeItems`, nếu số lượng gộp của một sản phẩm > `MAX_QUANTITY_PER_ITEM` → `OrderError("VALIDATION_ERROR", "Thông tin đơn hàng không hợp lệ", { items: "Mỗi sản phẩm tối đa 10 sản phẩm" })` (dùng hằng số, không viết cứng 10) (phụ thuộc T035)
- [x] T037 [P] [US5] Mở rộng src/features/coupons/applied-coupon-store.ts: state `{ coupon, serverError?: { code, message } }`, `markServerError`, và hàm thuần `getAppliedCouponStatus(state, subtotal, now)` → `{ status: "none" | "active" | "blocked", discount, message? }` (`blocked` khi có `serverError` hoặc `evaluateCoupon` = `expired`) (phụ thuộc T034)
- [x] T038 [US5] Sửa src/features/checkout/components/checkout-form.tsx và src/features/coupons/components/coupon-field.tsx: lỗi `POST /api/orders` có `code` bắt đầu `COUPON_` → `markServerError`, giữ nguyên `values`, hiện message ở `coupon-message` thay vì `submitError`; nút "Đặt hàng" `disabled` khi `blocked`; `CouponField` hiện nút "Gỡ mã" (`coupon-remove`, `type="button"`) gọi `clear()` (phụ thuộc T033, T037)
- [x] T039 [US5] Chạy `npm run check` — phải pass

**Checkpoint**: US1 + US5 = MVP an toàn (giảm giá đúng và không gian lận được)

---

## Phase 5: User Story 2 - Biết rõ vì sao mã không dùng được (Priority: P2)

**Goal**: Thông báo tiếng Việt đúng một trong ba lý do (kèm số tiền cần mua thêm), lỗi ô trống,
xóa lỗi khi sửa.

**Independent Test**: Áp dụng `KHONGCO`, `TET2026`, `GIAM50K` (giỏ `p006`×1 = 450.000 ₫) → mỗi lần
đúng thông báo, tổng không đổi.

### Tests for User Story 2 ⚠️ (viết trước, xác nhận FAIL)

- [x] T040 [P] [US2] Test lý do không hợp lệ trong src/features/coupons/coupon-service.test.ts: `KHONGCO` → `COUPON_NOT_FOUND` "Mã giảm giá không tồn tại"; `TET2026` với `now` `2026-03-01T00:00:00+07:00` → `COUPON_EXPIRED` "Mã giảm giá đã hết hạn"; `GIAM50K` + `p006`×1 → `COUPON_MIN_SUBTOTAL_NOT_MET` message đúng bằng `` `Đơn hàng chưa đạt giá trị tối thiểu ${formatCurrency(500000)} để dùng mã này. Mua thêm ${formatCurrency(50000)} để được giảm giá.` ``; cả ba có `details.couponCode` = message
- [x] T041 [P] [US2] Test route src/app/api/coupons/validate/route.test.ts: 422 cho ba lý do với body đúng định dạng `{ error: { code, message, details } }` (dùng `vi.setSystemTime` cho `TET2026`); `couponCode: "   "` → 400 với `details.couponCode` = "Vui lòng nhập mã giảm giá"
- [x] T042 [P] [US2] Test src/features/coupons/components/coupon-field.test.tsx: ô trống hoặc `"   "` + "Áp dụng" → "Vui lòng nhập mã giảm giá" và `fetch` không được gọi; API trả 422 → message ở `coupon-message` (`role="alert"`), input có `aria-invalid="true"` và `aria-describedby` trỏ tới message, store vẫn `null`; gõ thêm ký tự → message biến mất

### Implementation for User Story 2

- [x] T043 [US2] Trong src/features/coupons/coupon-service.ts: `evaluateCoupon` trả `invalid` → ném `OrderError` với mã lỗi tương ứng, message `getCouponErrorMessage(...)`, `details: { couponCode: message }` — dùng `toCouponOrderError` (T035) (phụ thuộc T035, T040)
- [x] T044 [US2] Trong src/features/coupons/components/coupon-field.tsx: kiểm tra ô trống phía client (FR-008) trước khi gọi API; hiển thị `error.details.couponCode ?? error.message` ở `coupon-message`; `aria-invalid`/`aria-describedby`; xóa lỗi khi `onChange` (phụ thuộc T042, T043)
- [x] T045 [US2] Chạy `npm run check` — phải pass

**Checkpoint**: Mọi trường hợp mã không hợp lệ có thông báo đúng

---

## Phase 6: User Story 3 - Gỡ hoặc đổi mã đã áp dụng (Priority: P2)

**Goal**: Một mã mỗi đơn; gỡ mã; trạng thái "tạm ngưng" khi giỏ tụt dưới tối thiểu và tự có hiệu lực
lại (Clarification Q2).

**Independent Test**: Áp dụng `GIAM50K` với giỏ 600.000 ₫ → bớt còn 450.000 ₫ → mã tạm ngưng, "Mua
thêm 50.000 ₫", nút "Đặt hàng" khóa → thêm lại sản phẩm → mã tự hiệu lực; "Gỡ mã" → tổng về ban đầu.

### Tests for User Story 3 ⚠️ (viết trước, xác nhận FAIL)

- [x] T046 [P] [US3] Test `getAppliedCouponStatus` trong src/features/coupons/applied-coupon-store.test.ts: `GIAM50K` tại 500_000 → `active`, giảm 50_000; tại 499_999 → `suspended`, giảm 0, message chứa `formatCurrency(1)`; quay lại 500_000 → `active`; `serverError` ưu tiên hơn `suspended` (→ `blocked`)
- [x] T047 [P] [US3] Test src/features/coupons/components/coupon-field.test.tsx: khi đã áp dụng thì không có ô nhập (không thể nhập mã thứ hai — FR-014), có "Gỡ mã"; bấm "Gỡ mã" → store `null`, ô nhập hiện lại và rỗng; trạng thái `suspended` → `coupon-message` hiện câu "chưa đạt giá trị tối thiểu … Mua thêm …"
- [x] T048 [P] [US3] Test src/features/checkout/components/checkout-form.test.tsx: store `GIAM50K`, giỏ `p006`×1 → không có `discount-amount`, `checkout-total` = 480.000 ₫ (450.000 + 30.000 ship), nút "Đặt hàng" `disabled`, có "Mua thêm 50.000 ₫"; `cartStore.dispatch` thêm `p010` → `discount-amount` "-50.000 ₫", nút bật; "Gỡ mã" → tổng không giảm

### Implementation for User Story 3

- [x] T049 [US3] Mở rộng `getAppliedCouponStatus` trong src/features/coupons/applied-coupon-store.ts: thêm `suspended` khi `evaluateCoupon` = `min_subtotal_not_met` (giảm 0, message từ `getCouponErrorMessage`), tự về `active` khi đạt lại; thứ tự ưu tiên `blocked` > `suspended` > `active` (phụ thuộc T046)
- [x] T050 [US3] Sửa src/features/coupons/components/coupon-field.tsx: chế độ "đã áp dụng" chỉ hiện mã + "Gỡ mã" (ẩn ô nhập), hiện message tạm ngưng ở `coupon-message`; sau khi gỡ, ô nhập rỗng và nhận focus (phụ thuộc T047, T049)
- [x] T051 [US3] Sửa src/features/checkout/components/checkout-form.tsx: dùng `getAppliedCouponStatus(state, subtotal, new Date())` cho `discount` (0 khi không `active`) và `disabled` nút "Đặt hàng" khi `suspended` hoặc `blocked`; chỉ gửi `couponCode` khi `active` (phụ thuộc T048, T049)
- [x] T052 [US3] Chạy `npm run check` — phải pass

**Checkpoint**: Một mã mỗi đơn, gỡ mã, tạm ngưng/hiệu lực lại hoạt động

---

## Phase 7: User Story 4 - Xem giảm giá trong chi tiết đơn hàng (Priority: P3)

**Goal**: Trang chi tiết đơn hiện mã và số tiền giảm; đơn cũ hiển thị đúng như trước.

**Independent Test**: Đặt đơn với `GIAM50K` → trang chi tiết có "Giảm giá (GIAM50K) -50.000 ₫"; mở
đơn cũ không có trường giảm giá → không có dòng giảm, số tiền như cũ.

### Tests for User Story 4 ⚠️ (viết trước, xác nhận FAIL)

- [x] T053 [P] [US4] Test src/features/orders/components/order-totals.test.tsx: đơn có `couponCode: "GIAM50K"`, `discount: 50000` → dòng `order-discount` "Giảm giá (GIAM50K)" và "-50.000 ₫", tổng = `order.total` đã lưu; fixture đơn cũ không có `couponCode`/`discount` → không có `order-discount`, tạm tính/phí ship/tổng như lưu; `discount: 0` không mã → không có dòng
- [x] T054 [P] [US4] Test src/features/orders/order-service.test.ts: `cancelOrder` giữ nguyên `couponCode`/`discount`; repository seed đơn cũ không có hai trường → `getOrder`, `listOrders`, `cancelOrder` hoạt động bình thường (FR-022)

### Implementation for User Story 4

- [x] T055 [US4] Tạo Server Component src/features/orders/components/order-totals.tsx: `<dl>` Tạm tính / "Giảm giá ({MÃ})" (chỉ khi `couponCode` và `(discount ?? 0) > 0`, `data-testid="order-discount"`, `-formatCurrency`) / Phí giao hàng ("Miễn phí" khi 0) / Tổng cộng = `order.total` (phụ thuộc T053)
- [x] T056 [US4] Sửa src/app/orders/[id]/page.tsx: thay khối `<dl>` tổng tiền bằng `<OrderTotals order={order} />`; giữ nguyên các phần khác (phụ thuộc T055)
- [x] T057 [US4] Chạy `npm run check` — phải pass

**Checkpoint**: Cả năm user story hoạt động độc lập

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T058 [P] Test ranh giới client/server src/features/coupons/client-boundary.test.ts (`// @vitest-environment node`): quét mọi file trong `src/` có `"use client"` và khẳng định không import `@/data/coupons`, `@/features/coupons/coupon-service` hay `@/features/orders/server` (không lộ danh sách mã — research §1)
- [x] T059 Thêm kịch bản vào e2e/shopping-flow.spec.ts (giữ nguyên hai test cũ): test "khách hàng dùng mã SHOPLITE10 khi thanh toán" — theo các bước của test đầu thêm SwiftClick ×2 (900.000 ₫) → "Tiến hành thanh toán" → điền form → `getByLabel("Mã giảm giá")` nhập `shoplite10` → "Áp dụng" → `getByTestId("discount-amount")` chứa "SHOPLITE10" và `/-90\.000/`, `getByTestId("checkout-total")` chứa `/810\.000/` (900.000 − 90.000, miễn phí ship) → "Đặt hàng" → trang đơn `/orders/SL-…?placed=1` có `getByTestId("order-discount")` chứa "SHOPLITE10" và `/-90\.000/`
- [x] T060 Chạy `npm run test:e2e` — phải pass (lần đầu: `npx playwright install chromium`)
- [x] T061 [P] Cập nhật AGENTS.md: thêm dòng Coupons vào Codemap (`src/features/coupons/`: `coupon-rules.ts`, `coupon-service.ts`, `applied-coupon-store.ts`, `components/coupon-field.tsx`; `src/data/coupons.ts`; route `api/coupons/validate`), luồng áp dụng mã, quy tắc mục 5 (tính giảm, phí ship xét trước giảm, server kiểm tra lại), mục 7 (không import `@/data/coupons` vào Client Component), và `data-testid` mới ở mục 6
- [x] T062 [P] Cập nhật README.md: bảng API thêm `POST /api/coupons/validate`, ví dụ `POST /api/orders` có `couponCode`, quy tắc nghiệp vụ về mã giảm giá và ba mã ban đầu
- [ ] T063 Chạy các kịch bản thủ công + curl ở specs/001-discount-codes/quickstart.md (mục 2 và 3), ghi lại kết quả lệch nếu có
  - _Ghi chú 2026-11-08:_ chưa chạy - lệnh khởi động dev server + curl bị từ chối quyền. Các kịch bản API
    A1–A6, O1–O5 đã được phủ bằng route/service test; kịch bản thủ công trên trình duyệt chưa chạy.
- [ ] T064 Chạy `npm run format:check` và `npm run check` lần cuối — phải pass
  - _Ghi chú 2026-11-08:_ `npm run check` pass (197 test). `npm run format:check` FAIL ở 93 file do repo
    thiếu file cấu hình Prettier (lỗi có sẵn, cả file không đổi như `src/lib/http.ts` cũng fail); với
    `--print-width 100 --plugin prettier-plugin-tailwindcss` thì toàn bộ `src/`, `e2e/`, AGENTS.md, README.md sạch.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → các user story.
- **US1 (Phase 3)**: cần Phase 2.
- **US5 (Phase 4)**: cần US1 (sửa cùng `placeOrder`, `checkout-form.tsx`, store).
- **US2 (Phase 5)**: cần US1 (`coupon-service.ts`, `coupon-field.tsx`) và T035 của US5
  (`toCouponOrderError` dùng chung).
- **US3 (Phase 6)**: cần US1; dùng `getAppliedCouponStatus` từ US5 (T037).
- **US4 (Phase 7)**: chỉ cần Phase 2 (T005) + đơn có mã từ US1 để kiểm thử end-to-end; component
  test tự dựng fixture nên làm được ngay sau Phase 2.
- **Polish (Phase 8)**: sau khi các story mong muốn hoàn tất; T059 cần US1 + US4.

### Within Each User Story

- Test viết trước và phải FAIL → cài đặt → `npm run check`.
- Schema → service → route → store → component → tích hợp form.

### Parallel Opportunities

- Phase 2: T004, T005, T006, T007, T009, T011 song song.
- US1: toàn bộ test T014 – T020 song song; T021, T026, T028 song song.
- US5: T031 – T034 song song; T037 song song với T035 – T036.
- US2, US3, US4: các task test trong mỗi phase song song; US4 có thể làm song song với US2/US3 bởi
  người khác (khác file).
- Polish: T058, T061, T062 song song.

---

## Parallel Example: User Story 1

```bash
# Viết toàn bộ test US1 cùng lúc (mỗi file một task):
Task: "T014 Test couponCode trong src/features/checkout/checkout-schema.test.ts"
Task: "T015 Test luồng hợp lệ trong src/features/coupons/coupon-service.test.ts"
Task: "T016 Test route src/app/api/coupons/validate/route.test.ts"
Task: "T017 Test đặt hàng có mã trong src/features/orders/order-service.test.ts"
Task: "T018 Test store trong src/features/coupons/applied-coupon-store.test.ts"
Task: "T019 Test component src/features/coupons/components/coupon-field.test.tsx"
Task: "T020 Test tích hợp src/features/checkout/components/checkout-form.test.tsx"

# Sau đó các task cài đặt không phụ thuộc nhau:
Task: "T021 checkout-schema.ts"   Task: "T026 applied-coupon-store.ts"   Task: "T028 checkout-summary.tsx"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 + Phase 2.
2. Phase 3 (US1) → kiểm chứng độc lập.
3. Phase 4 (US5) → **MVP an toàn**: chỉ phát hành khi có cả US1 và US5, vì US1 một mình chưa xử lý
   mã không hợp lệ lúc đặt hàng.

### Incremental Delivery

1. Setup + Foundational → nền tảng.
2. US1 + US5 → demo/phát hành MVP.
3. US2 → thông báo lỗi rõ ràng.
4. US3 → gỡ mã, tạm ngưng.
5. US4 → hiển thị trên chi tiết đơn.
6. Polish → e2e SHOPLITE10, tài liệu, quickstart.

---

## Notes

- Mỗi task một commit hoặc một nhóm logic; commit message theo quy ước repo.
- Không ghi vào `storage/` thật trong unit test; không truy cập `localStorage` ngoài `cart-store.ts`.
- Ngoài phạm vi tasks này (từ security checklist, cần quyết định trong spec trước nếu muốn làm):
  giới hạn số dòng `items` (CHK012), rate limit dò mã (CHK019), log từ chối mã (CHK030).

---

## Phase 9: Convergence

- [ ] T065 CRITICAL: Gỡ dependency runtime `dayjs` khỏi package.json và package-lock.json (`npm uninstall dayjs`) — không file nào trong `src/`/`e2e/` dùng và plan.md ghi "không thêm dependency mới", không có mục Complexity Tracking biện minh; chạy lại `npm run check` per Constitution IV (contradicts)
- [ ] T066 CRITICAL: Thêm cấu hình Prettier ở gốc repo (ví dụ `.prettierrc.json` với `printWidth: 100` và `plugins: ["prettier-plugin-tailwindcss"]`, khớp style hiện có của code) để `npm run format:check` sạch; nếu còn file lệch thì chạy `npm run format` và xác nhận `npm run check` vẫn pass per Constitution: Ràng buộc kỹ thuật + Definition of Done / T064 (partial)
- [ ] T067 Chạy các kịch bản thủ công trên trình duyệt và curl ở specs/001-discount-codes/quickstart.md (mục 2 và 3) với `npm run dev`, ghi kết quả (và mọi điểm lệch) vào ghi chú của T063 per T063 / quickstart.md (partial)
- [ ] T068 Xóa src/lib/demo.ts (`export const demo = { a: 1, b: 2 }`, không được import ở đâu, không có trong plan/tasks), hoặc ghi lý do giữ lại per plan: Project Structure (unrequested)
