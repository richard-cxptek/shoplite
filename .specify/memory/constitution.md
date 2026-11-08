<!--
Sync Impact Report
- Thay đổi version: (template chưa điền) → 1.0.0
- Nguyên tắc (bản đầu tiên, thay toàn bộ placeholder):
  - [PRINCIPLE_1_NAME] → I. Kiến trúc theo tính năng
  - [PRINCIPLE_2_NAME] → II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Server là nguồn sự thật về tiền
  - [PRINCIPLE_4_NAME] → IV. Đơn giản trước
  - [PRINCIPLE_5_NAME] → V. Trải nghiệm tiếng Việt và dễ tiếp cận
- Mục thêm mới: Ràng buộc kỹ thuật, Quy trình phát triển, Governance
- Mục bị xóa: không có
- Template cần đồng bộ: không sửa trong lệnh này (plan/spec/tasks template đọc constitution lúc chạy)
  - .specify/templates/plan-template.md — "Constitution Check" sẽ đối chiếu 5 nguyên tắc ở đây
- TODO hoãn lại: không có
-->

# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng

- Logic nghiệp vụ, component, type và test của một tính năng MUST nằm trong
  `src/features/<feature>/` (hiện có `catalog`, `cart`, `checkout`, `orders`).
- `src/app/` MUST chỉ chứa page, layout và route handler mỏng: đọc input, gọi hàm của feature,
  trả kết quả. Không đặt tính toán, validate nghiệp vụ hay truy cập lưu trữ trong `src/app/`.
- UI dùng chung MUST đặt ở `src/components/`, tiện ích không thuộc nghiệp vụ ở `src/lib/`,
  dữ liệu mẫu ở `src/data/`.
- File MUST đặt tên kebab-case; test MUST đặt cạnh file nguồn (`*.test.ts(x)`); component
  MUST export dạng named function PascalCase.
- Mặc định là Server Component; chỉ thêm `"use client"` khi cần state, hook hoặc API trình duyệt.
  Code dùng `node:*` (ví dụ `src/features/orders/server.ts`) MUST NOT được import vào Client
  Component.
- Truy cập `localStorage` MUST chỉ nằm trong `cart-store.ts`; đọc/ghi đơn hàng MUST đi qua
  `OrderRepository`.

**Lý do:** gom mỗi capability vào một chỗ giúp đọc hiểu, test độc lập và thay đổi một tính năng
mà không lan sang route hay tính năng khác.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

- Mọi quy tắc tính tiền (giá, phí ship, giảm giá, tổng tiền), giới hạn (số lượng tối đa, tồn kho,
  độ dài trường) và chuyển trạng thái (ví dụ hủy đơn chỉ khi `pending`) MUST có unit test được
  viết TRƯỚC khi viết code, và test MUST fail trước khi được làm cho pass (Red → Green → Refactor).
- Test MUST bao gồm giá trị biên: ngay dưới, đúng bằng và ngay trên ngưỡng (ví dụ subtotal
  499_999 / 500_000 cho miễn phí ship; số lượng 10 / 11; `stock` 0 / 1), cùng trường hợp rỗng.
- Test service MUST dùng `createInMemoryOrderRepository()` và cố định `now` / `generateId`;
  test chạm file hệ thống MUST ghi vào thư mục tạm, MUST NOT ghi vào `storage/` thật.
- Sửa một quy tắc nghiệp vụ đã có MUST cập nhật hoặc thêm test bảo vệ quy tắc đó trong cùng
  thay đổi; không được xóa/nới test để code pass.
- `npm run check` (lint + typecheck + test) MUST pass trước khi commit hoặc báo cáo hoàn thành.
  Thay đổi luồng mua/đặt hàng hoặc UI có `data-testid` MUST chạy thêm `npm run test:e2e`.

**Lý do:** sai một quy tắc tiền hay trạng thái gây thiệt hại trực tiếp; test viết trước buộc quy tắc
được nêu rõ ràng và giá trị biên là nơi lỗi hay xuất hiện nhất.

### III. Server là nguồn sự thật về tiền

- Giá đơn vị, phí ship, giảm giá và tổng tiền MUST được server tính lại từ catalog và các hàm
  dùng chung (`calculateOrderTotals`, `SHIPPING_OPTIONS`, `FREE_SHIPPING_THRESHOLD` trong
  `src/features/checkout/pricing.ts`). Giá trị tiền từ client MUST NOT được tin hay lưu.
- Payload từ client MUST chỉ chứa định danh và số lượng (`productId`, `quantity`), lựa chọn
  (phương thức giao hàng/thanh toán, mã giảm giá nếu có) và thông tin khách hàng;
  `placeOrderSchema` MUST NOT có trường giá/tổng tiền.
- Client MAY hiển thị tạm tính nhưng MUST dùng chính các hàm trong `pricing.ts`; không được tính
  phí hay giảm giá ở nơi khác.
- Mọi input từ bên ngoài (body, query, params) MUST được validate bằng Zod schema đặt trong feature,
  dùng `safeParse`; type MUST suy ra bằng `z.infer`.
- Lỗi nghiệp vụ MUST ném `OrderError(code, message, details?)`, mã lỗi mới MUST thêm vào
  `OrderErrorCode` và `HTTP_STATUS_BY_CODE`; API MUST trả lỗi dạng
  `{ error: { code, message, details? } }` qua `handleRouteError`.

**Lý do:** client có thể bị sửa tùy ý; chỉ khi server tính lại toàn bộ thì số tiền trên đơn hàng mới
đáng tin.

### IV. Đơn giản trước

- Tính năng mới MUST dùng stack hiện có: Next.js App Router, React, TypeScript, Tailwind CSS v4,
  Zod, Vitest + Testing Library, Playwright; dữ liệu catalog tĩnh, giỏ hàng `localStorage`,
  đơn hàng JSON qua `OrderRepository`.
- Thêm dependency runtime, database, dịch vụ bên ngoài hoặc tầng trừu tượng mới MUST NOT xảy ra
  trừ khi `plan.md` ghi rõ lý do, phương án đơn giản hơn đã cân nhắc và vì sao bị loại (mục
  Complexity Tracking).
- Code SHOULD giải quyết đúng yêu cầu hiện tại (YAGNI); tận dụng tiện ích sẵn có (`cn`, `Button`,
  `formatCurrency`, `normalizeText`, `readJsonBody`...) thay vì viết lại.

**Lý do:** ShopLite là dự án mẫu cần đọc hiểu được trong một buổi; mỗi dependency hay hạ tầng mới
làm tăng chi phí học, cài đặt và bảo trì.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận

- Toàn bộ text UI, message lỗi (kể cả message Zod và API), comment và tên test MUST viết bằng
  tiếng Việt.
- Tiền MUST hiển thị qua `formatCurrency`, ngày giờ qua `formatDateTime` (`src/lib/format.ts`);
  không tự định dạng số tiền. Tìm kiếm MUST không phân biệt dấu qua `normalizeText`.
- Mọi trường form MUST có `<label>` gắn với input (`htmlFor`/`id`), đánh dấu trường bắt buộc, và
  hiển thị lỗi ngay tại trường tương ứng (`aria-invalid`, map lỗi phẳng qua `toFieldErrors`).
  Lỗi chung không thuộc trường nào dùng key `_form`.
- Phần tử tương tác MUST dùng được bằng bàn phím và có tên truy cập được (text hoặc `aria-label`).
- Dữ liệu chỉ có ở client (giỏ hàng) MUST chờ `useHydrated` trước khi render để tránh lệch hydrate.

**Lý do:** người dùng mục tiêu là người Việt; nhãn và lỗi theo từng trường giúp mọi người, kể cả
người dùng trình đọc màn hình, hoàn tất mua hàng.

## Ràng buộc kỹ thuật

- Runtime: Node.js >= 22.12, npm 10+. Alias `@/*` → `src/*`.
- Quy tắc nghiệp vụ hiện hành MUST được giữ nguyên trừ khi spec thay đổi tường minh và có test:
  - Giỏ hàng: tối đa `MAX_QUANTITY_PER_ITEM = 10` mỗi sản phẩm, không vượt `stock`
    (`getMaxQuantity`); sản phẩm `stock <= 0` không thêm được.
  - Phí ship: `standard` 30_000, `express` 60_000; `standard` miễn phí khi subtotal >=
    `FREE_SHIPPING_THRESHOLD = 500_000`; giỏ rỗng phí = 0.
  - Hủy đơn: chỉ khi `status === "pending"`, ngược lại `INVALID_STATUS_TRANSITION` (409);
    `PATCH /api/orders/:id` chỉ nhận `{ "status": "cancelled" }`.
- Mã đơn hàng dạng `SL-YYYYMMDD-XXXXXX`; repository JSON ghi file `.tmp` rồi `rename`.
- Trang đọc đơn hàng dùng `export const dynamic = "force-dynamic"`.
- Không bật lại `agentRules` trong `next.config.ts`.
- MUST NOT commit `.env*`, `storage/`, `coverage/`, `playwright-report/`, `test-results/`.
- Ghép class Tailwind qua `cn`; code MUST qua Prettier (`npm run format:check` sạch).

## Quy trình phát triển

- Mỗi tính năng MUST làm trên nhánh riêng (tạo bởi `/speckit-specify` hoặc tương đương), không
  commit trực tiếp vào `main`.
- Trình tự: `spec.md` → `/speckit-clarify` → `plan.md` (qua Constitution Check) → `tasks.md` →
  implement. MUST NOT viết code khi spec còn câu hỏi mở (`[NEEDS CLARIFICATION]` hoặc câu hỏi
  chưa được trả lời).
- `plan.md` MUST có mục Constitution Check đối chiếu 5 nguyên tắc; mọi vi phạm MUST được ghi vào
  Complexity Tracking kèm lý do, nếu không thì plan không được duyệt.
- Trong `tasks.md`, task viết test cho quy tắc nghiệp vụ MUST đứng trước task implement tương ứng.
- Thay đổi chạm hơn 3 file SHOULD trình bày kế hoạch trước khi sửa.
- Definition of Done: `npm run check` pass, `npm run format:check` sạch, logic mới có test cạnh
  file nguồn, e2e pass nếu chạm luồng mua/đặt hàng hoặc `data-testid`, text mới bằng tiếng Việt.
- Review MUST xác nhận tuân thủ constitution trước khi merge.

## Governance

- Constitution này có hiệu lực cao hơn mọi quy ước khác trong repo. `AGENTS.md` / `CLAUDE.md`
  là hướng dẫn vận hành chi tiết và MUST nhất quán với constitution; khi mâu thuẫn, constitution
  thắng và tài liệu kia phải được sửa.
- Mọi sửa đổi MUST qua pull request, nêu rõ thay đổi, lý do và ảnh hưởng tới spec/plan/tasks
  hoặc code hiện có (kèm kế hoạch chuyển đổi nếu cần).
- Mỗi lần sửa constitution MUST tăng version theo semver và cập nhật `Last Amended`:
  - MAJOR: xóa hoặc định nghĩa lại một nguyên tắc/quy tắc governance theo cách không tương thích.
  - MINOR: thêm nguyên tắc/mục mới hoặc mở rộng đáng kể hướng dẫn.
  - PATCH: làm rõ câu chữ, sửa lỗi chính tả, thay đổi không mang ngữ nghĩa.
- Tuân thủ được kiểm tra ở Constitution Check của mỗi `plan.md`, ở `/speckit-analyze` và trong
  code review. Ngoại lệ MUST được ghi lại và có lý do; nguyên tắc II không có ngoại lệ.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08
