# Research: Mã giảm giá khi thanh toán

Technical Context không còn mục NEEDS CLARIFICATION (stack do người yêu cầu chỉ định). Tài liệu này
ghi lại các quyết định thiết kế còn mở và lý do.

## 1. Client kiểm tra mã bằng cách nào

- **Decision**: Endpoint mới `POST /api/coupons/validate` nhận `{ code, items }`. Server tra mã,
  tính tạm tính từ catalog, kiểm tra theo thứ tự tồn tại → còn hạn → đạt tối thiểu và trả về
  `PublicCoupon` (quy tắc của đúng mã đó) cùng `subtotal`, `discount`.
- **Rationale**: Nếu client import `src/data/coupons.ts`, toàn bộ mã (kể cả mã chưa công bố) nằm
  trong bundle JS và ai cũng đọc được. Endpoint chỉ tiết lộ quy tắc của mã khách đã biết. Trả về
  quy tắc giúp client tự tính lại khi giỏ thay đổi mà không gọi mạng (FR-016).
- **Alternatives considered**:
  - Kiểm tra hoàn toàn ở client với danh sách mã bundle sẵn — loại vì lộ mã.
  - Endpoint chỉ trả `discount` (không trả quy tắc) và gọi lại mỗi khi giỏ đổi — loại vì phải gọi
    mạng mỗi thay đổi giỏ, phức tạp hơn khi giỏ đổi ở tab khác, chậm hơn cho trạng thái tạm ngưng.
  - Server Action — loại để giữ nhất quán với các route handler `/api/*` và định dạng lỗi chuẩn.

## 2. Giữ mã đang áp dụng khi khách rời trang thanh toán

- **Decision**: `applied-coupon-store.ts` — store module-level trong bộ nhớ, đọc bằng
  `useSyncExternalStore` (cùng mẫu `cart-store.ts`), `getServerSnapshot` luôn trả `null`. Không
  ghi `localStorage`/`sessionStorage`. Mã mất khi tải lại trang.
- **Rationale**: User Story 3 kịch bản 3 – 4 yêu cầu mã còn đó khi khách sang `/cart` bớt sản phẩm
  rồi quay lại; điều hướng client của App Router giữ nguyên module state. Spec chỉ yêu cầu giữ trong
  phiên thanh toán. Constitution cấm truy cập `localStorage` ngoài `cart-store.ts`.
- **Alternatives considered**:
  - State trong `CheckoutForm` — loại vì mất khi điều hướng sang `/cart`.
  - Lưu vào giỏ (`shoplite:cart`) — loại vì đổi định dạng dữ liệu giỏ và trộn hai mối quan tâm.
  - `sessionStorage` — loại vì trái tinh thần quy tắc lưu trữ của constitution và không cần thiết.
- **Lưu ý**: store chỉ được ghi từ event handler phía client, không bao giờ ghi khi render server,
  nên không có rủi ro chia sẻ state giữa các request trên server.

## 3. Tích hợp với `pricing.ts`

- **Decision**: `calculateOrderTotals(lines, method, discount = 0)` trả
  `{ subtotal, discount, shippingFee, total }`; `discount` được kẹp vào `[0, subtotal]`;
  `shippingFee` vẫn tính từ `subtotal` trước giảm (FR-011); `total = subtotal − discount +
shippingFee`. Không thêm hàm tính tiền riêng cho mã — caller (order-service, summary) gọi
  `evaluateCoupon` rồi truyền `discount`.
- **Rationale**: Giữ `pricing.ts` không phụ thuộc `coupons` (coupons đã phụ thuộc
  `calculateSubtotal`), tránh vòng import; tham số mặc định 0 giữ nguyên mọi caller và test hiện có.
- **Alternatives considered**: `calculateOrderTotals(lines, method, coupon, now)` — loại vì tạo vòng
  phụ thuộc `pricing ↔ coupons` và trộn kiểm tra hiệu lực mã vào hàm tính tiền.

## 4. Cách tính số tiền giảm và làm tròn

- **Decision**:
  - `percent`: `Math.min(Math.floor((subtotal * percent) / 100), maxDiscount)`.
  - `fixed`: `amount`.
  - Kết quả cuối: `Math.min(raw, subtotal)`, luôn là số nguyên ≥ 0.
- **Rationale**: Tiền VND không có phần lẻ; làm tròn xuống để không vượt mức công bố (spec
  Assumptions). `subtotal * percent` là số nguyên nên phép chia cho 100 rồi `floor` cho kết quả
  chính xác.
- **Alternatives considered**: `Math.round` — loại vì có thể giảm nhiều hơn 10% công bố 0,5đ.

## 5. Ngày hết hạn và múi giờ

- **Decision**: Lưu `expiresOn: "YYYY-MM-DD"` (ngày cuối còn hiệu lực theo giờ Việt Nam). Mã hết
  hạn khi ``now >= Date.parse(`${expiresOn}T00:00:00+07:00`) + 24h``. `now` được inject (`() => Date`).
- **Rationale**: Việt Nam không có giờ mùa hè, offset cố định +07:00; tránh phụ thuộc múi giờ của
  server. Inject `now` để test biên `2026-02-28T23:59:59.999+07:00` (còn hạn) và
  `2026-03-01T00:00:00+07:00` (hết hạn).
- **Alternatives considered**: lưu `expiresAt` ISO đầy đủ — chấp nhận được nhưng dễ ghi sai giờ
  khi nhập dữ liệu; dùng `dayjs` timezone plugin — không cần.

## 6. Mã lỗi và HTTP status

- **Decision**: Thêm vào `OrderErrorCode`: `COUPON_NOT_FOUND`, `COUPON_EXPIRED`,
  `COUPON_MIN_SUBTOTAL_NOT_MET`, tất cả map 422. `details = { couponCode: <message> }` để client
  hiển thị tại ô mã. Message dựng bằng `getCouponErrorMessage` dùng chung cho server và trạng thái
  tạm ngưng ở client (cùng câu chữ FR-007).
- **Rationale**: Constitution yêu cầu lỗi nghiệp vụ qua `OrderError` + `HTTP_STATUS_BY_CODE`.
  Dùng một mã/status cho cả `/api/coupons/validate` và `/api/orders`; 404 không phù hợp cho
  `POST /api/orders`. `details` là `Record<string, string>` theo kiểu hiện có.
- **Alternatives considered**: lớp `CouponError` riêng — loại vì `handleRouteError` chỉ nhận
  `OrderError`, thêm lớp là thêm nhánh xử lý không cần thiết.

## 7. Kiểm tra lại khi đặt hàng

- **Decision**: `createOrderService` nhận thêm dep `findCoupon?: (code) => Coupon | undefined`
  (mặc định tra `COUPONS`). `placeOrder` gọi `now()` một lần, dùng cho cả kiểm tra hạn và
  `createdAt`; tính `subtotal` từ giá catalog; nếu có `couponCode` thì `evaluateCoupon` → lỗi thì
  ném `OrderError` tương ứng (FR-019, không tự tạo đơn không giảm); hợp lệ thì truyền `discount`
  vào `calculateOrderTotals` và lưu `couponCode` (in hoa) + `discount`.
- **Rationale**: Một thời điểm duy nhất tránh trường hợp mã hết hạn giữa hai lần gọi `now()`; dep
  injection theo mẫu `findProduct`.

## 8. Tương thích đơn hàng cũ

- **Decision**: `Order.couponCode?: string`, `Order.discount?: number`. Không migration file JSON.
  Hiển thị qua `OrderTotals`: chỉ vẽ dòng giảm giá khi `couponCode` có và `(discount ?? 0) > 0`;
  luôn hiển thị `order.total` đã lưu. Đơn mới không dùng mã lưu `discount: 0`, không có
  `couponCode`.
- **Rationale**: `storage/orders.json` hiện có không có hai trường này; trường tùy chọn đọc ra là
  `undefined` và được coi là 0 (FR-022). `cancelOrder` spread `...order` nên giữ nguyên trường.

## 9. Danh sách test viết trước (giá trị biên, theo nguyên tắc II)

- `coupon-rules`: chuẩn hóa `shoplite10` → `SHOPLITE10`; chuỗi toàn khoảng trắng → rỗng;
  SHOPLITE10 ở 299.999 (thiếu 1đ) / 300.000 / 1.000.000 (=100.000) / 1.000.001 (=100.000) /
  333.335 (=33.333); GIAM50K ở 499.999 / 500.000; mã cố định lớn hơn tạm tính → giảm = tạm tính;
  TET2026 ở `2026-02-28T23:59:59.999+07:00` (còn hạn) và `2026-03-01T00:00:00+07:00` (hết hạn);
  thứ tự lỗi (mã hết hạn và chưa đạt tối thiểu → báo hết hạn); message có `formatCurrency`.
- `pricing`: `discount` 0 giữ kết quả cũ; giỏ 520.000 + giảm 50.000 → ship 0, tổng 470.000;
  500.000 + SHOPLITE10 (50.000) → ship 0; 499.999 → ship 30.000; discount > subtotal bị kẹp;
  discount âm bị kẹp về 0.
- `checkout-schema`: `couponCode` tùy chọn, trim, rỗng coi như không có, quá 32 ký tự lỗi;
  body có `discount`/`total` bị bỏ qua (Zod strip).
- `order-service`: đặt với mã hợp lệ lưu `couponCode` + `discount` + `total` đúng; số tiền giảm
  tùy ý từ client bị bỏ qua; mã không tồn tại / hết hạn / chưa đạt → `OrderError` đúng code và
  không có đơn nào được lưu; không mã → `discount: 0`.
- `coupon-service` + route `api/coupons/validate`: 200 kèm quy tắc; 422 cho ba lý do; 400 khi body
  sai/thiếu mã; tạm tính tính từ catalog, không từ client.
- `applied-coupon-store`: áp dụng → active; tạm tính tụt dưới tối thiểu → suspended + shortfall;
  tăng lại → active; đánh dấu lỗi từ server → blocked đến khi gỡ; gỡ → null.
- `coupon-field` / `checkout-form`: ô trống báo FR-008 không gọi fetch; sửa input xóa lỗi; đang áp
  dụng thì ẩn ô nhập, hiện "Gỡ mã"; tạm ngưng/blocked thì nút "Đặt hàng" disabled; lỗi
  `COUPON_EXPIRED` khi đặt hàng giữ mã + giữ thông tin form.
- `order-totals`: đơn cũ không có trường giảm giá không hiện dòng giảm; đơn có mã hiện
  "Giảm giá (GIAM50K)" và "-50.000 ₫".

## 10. Rủi ro chấp nhận

- **Dò mã (brute force)** qua `/api/coupons/validate`: không có hạ tầng rate limit; mã là mã
  marketing công khai, không giới hạn lượt dùng → chấp nhận, ghi nhận cho phiên bản sau.
- **Đồng hồ client lệch**: client có thể hiển thị mã còn hạn khi server đã coi là hết hạn; server
  luôn quyết định khi đặt hàng (FR-018/019), client xử lý lỗi theo Clarification Q1.
