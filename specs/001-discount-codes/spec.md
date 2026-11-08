# Feature Specification: Mã giảm giá khi thanh toán

**Feature Branch**: `001-discount-codes`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Tính năng: Mã giảm giá khi thanh toán cho ShopLite. Khách nhập mã ở trang
thanh toán, thấy ngay số tiền giảm và tổng mới, có thể gỡ mã. Hai loại mã: phần trăm (có mức giảm tối
đa) và số tiền cố định; mỗi mã có thể có giá trị đơn tối thiểu và ngày hết hạn; mỗi đơn một mã; báo rõ
lý do khi mã không hợp lệ; đơn lưu mã và số tiền giảm, hiển thị ở chi tiết đơn; hệ thống xác nhận lại số
tiền giảm khi đặt hàng. Mã ban đầu: SHOPLITE10, GIAM50K, TET2026. Ngoài phạm vi: trang quản trị mã,
giới hạn lượt dùng, mã riêng cho từng khách."

## Clarifications

### Session 2026-11-08

- Q: Khi mã hợp lệ lúc áp dụng nhưng hết hạn lúc bấm "Đặt hàng", hệ thống làm gì? → A: Không tạo
  đơn; mã vẫn hiển thị ở tóm tắt kèm lỗi "Mã giảm giá đã hết hạn"; khách phải tự bấm "Gỡ mã" rồi mới
  đặt hàng lại được (Option B).
- Q: Khi khách xóa bớt sản phẩm làm tạm tính tụt dưới mức tối thiểu của mã đã áp dụng, mã xử lý thế
  nào? → A: Mã vẫn hiển thị ở trạng thái tạm ngưng (giảm 0 ₫, báo số tiền cần mua thêm), chặn nút
  "Đặt hàng" cho tới khi gỡ mã hoặc mua đủ; mã tự có hiệu lực lại khi tạm tính đạt lại mức tối thiểu
  (Option A).
- Q: Mốc 500.000đ miễn phí giao hàng tiêu chuẩn xét theo tạm tính trước hay sau giảm giá? → A: Trước
  giảm giá; quy tắc phí giao hàng hiện hành giữ nguyên (Option A).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Áp dụng mã hợp lệ và đặt hàng với giá đã giảm (Priority: P1)

Khách hàng đang ở trang thanh toán với giỏ hàng đủ điều kiện, nhập một mã giảm giá vào ô "Mã giảm
giá" và bấm "Áp dụng". Phần tóm tắt đơn hàng lập tức hiển thị dòng "Giảm giá" kèm mã đã áp dụng,
số tiền được giảm và tổng tiền mới. Khách đặt hàng; đơn hàng được tạo với đúng số tiền giảm và tổng
tiền mà hệ thống tự tính lại.

**Why this priority**: Đây là giá trị cốt lõi marketing cần — khách nhận được ưu đãi và đơn hàng
ghi nhận đúng số tiền. Không có câu chuyện này thì tính năng không tồn tại.

**Independent Test**: Thêm sản phẩm tổng 400.000đ vào giỏ, vào thanh toán, áp dụng `SHOPLITE10`,
kiểm tra tóm tắt hiển thị giảm 40.000đ, đặt hàng và kiểm tra đơn ghi nhận giảm 40.000đ.

**Acceptance Scenarios**:

1. **Given** giỏ hàng có tạm tính 400.000đ, **When** khách nhập `SHOPLITE10` và bấm "Áp dụng",
   **Then** tóm tắt hiển thị "Giảm giá (SHOPLITE10): -40.000 ₫" và tổng tiền giảm tương ứng 40.000đ.
2. **Given** giỏ hàng có tạm tính 2.000.000đ, **When** khách áp dụng `SHOPLITE10`, **Then** số tiền
   giảm là 100.000đ (mức tối đa), không phải 200.000đ.
3. **Given** giỏ hàng có tạm tính 600.000đ, **When** khách áp dụng `GIAM50K`, **Then** số tiền giảm
   là 50.000đ.
4. **Given** khách đã áp dụng một mã hợp lệ, **When** khách bấm đặt hàng, **Then** đơn hàng được tạo
   với mã, số tiền giảm và tổng tiền do hệ thống tính lại từ giá sản phẩm hiện hành.
5. **Given** khách nhập `shoplite10` (chữ thường, có khoảng trắng), **When** bấm "Áp dụng",
   **Then** mã được nhận diện như `SHOPLITE10`.
6. **Given** khách không nhập mã nào, **When** đặt hàng, **Then** đơn được tạo như hiện nay, không
   có giảm giá.

---

### User Story 2 - Biết rõ vì sao mã không dùng được (Priority: P2)

Khách nhập một mã không áp dụng được. Ngay dưới ô nhập mã, khách thấy thông báo tiếng Việt nêu đúng
lý do: mã không tồn tại, mã đã hết hạn, hoặc đơn chưa đạt giá trị tối thiểu kèm số tiền cần mua thêm.
Tổng tiền không thay đổi.

**Why this priority**: Thông báo rõ ràng giảm bỏ dở đơn và giảm thắc mắc gửi bộ phận hỗ trợ, đồng thời
gợi ý khách mua thêm để đạt điều kiện (tăng giá trị đơn).

**Independent Test**: Lần lượt áp dụng `KHONGCO`, `TET2026`, và `GIAM50K` với giỏ 450.000đ, kiểm tra
mỗi lần hiển thị đúng thông báo và tổng tiền không đổi.

**Acceptance Scenarios**:

1. **Given** bất kỳ giỏ hàng nào, **When** khách áp dụng `KHONGCO`, **Then** hiển thị "Mã giảm giá
   không tồn tại" và không có giảm giá.
2. **Given** ngày hiện tại sau 28/02/2026, **When** khách áp dụng `TET2026`, **Then** hiển thị "Mã
   giảm giá đã hết hạn" và không có giảm giá.
3. **Given** giỏ hàng có tạm tính 450.000đ, **When** khách áp dụng `GIAM50K`, **Then** hiển thị thông
   báo đơn chưa đạt tối thiểu 500.000 ₫ và cần mua thêm 50.000 ₫.
4. **Given** ô mã đang trống, **When** khách bấm "Áp dụng", **Then** hiển thị "Vui lòng nhập mã giảm
   giá" và không gửi yêu cầu kiểm tra.
5. **Given** một mã đã hiển thị lỗi, **When** khách sửa nội dung ô nhập, **Then** thông báo lỗi cũ
   được xóa.

---

### User Story 3 - Gỡ hoặc đổi mã đã áp dụng (Priority: P2)

Khách đã áp dụng một mã nhưng muốn bỏ hoặc thử mã khác. Khách bấm "Gỡ mã" để quay lại tổng tiền
ban đầu, rồi có thể nhập mã khác. Hệ thống không bao giờ cộng dồn hai mã.

**Why this priority**: Đảm bảo quy tắc "mỗi đơn một mã" và cho khách tự chọn ưu đãi tốt nhất.

**Independent Test**: Áp dụng `SHOPLITE10`, bấm "Gỡ mã", kiểm tra tổng tiền trở lại ban đầu; áp dụng
`GIAM50K` và kiểm tra chỉ còn đúng một dòng giảm giá.

**Acceptance Scenarios**:

1. **Given** đã áp dụng `SHOPLITE10`, **When** khách bấm "Gỡ mã", **Then** dòng giảm giá biến mất,
   tổng tiền trở lại giá trị trước khi áp dụng, và ô nhập mã sẵn sàng cho mã mới.
2. **Given** đã áp dụng một mã, **When** khách xem ô mã giảm giá, **Then** ô nhập được thay bằng mã
   đang áp dụng và nút "Gỡ mã" (không thể nhập mã thứ hai cùng lúc).
3. **Given** đã áp dụng `GIAM50K` với giỏ 600.000đ, **When** khách quay lại giỏ giảm còn 450.000đ rồi
   trở lại thanh toán, **Then** mã `GIAM50K` vẫn hiển thị nhưng ở trạng thái tạm ngưng: số tiền giảm
   0 ₫, ô mã báo "Đơn hàng chưa đạt giá trị tối thiểu 500.000 ₫ để dùng mã này. Mua thêm 50.000 ₫
   để được giảm giá.", và nút "Đặt hàng" bị chặn.
4. **Given** mã đang tạm ngưng như kịch bản 3, **When** khách thêm sản phẩm để tạm tính đạt lại
   ≥ 500.000đ, **Then** mã tự có hiệu lực lại, dòng giảm giá -50.000 ₫ hiện lại, nút "Đặt hàng" mở
   lại, khách không phải nhập lại mã.
5. **Given** mã đang tạm ngưng như kịch bản 3, **When** khách bấm "Gỡ mã", **Then** mã bị bỏ, lỗi
   biến mất và khách đặt hàng được với tổng tiền không giảm.

---

### User Story 4 - Xem giảm giá trong chi tiết đơn hàng (Priority: P3)

Sau khi đặt hàng, khách (hoặc nhân viên) mở trang chi tiết đơn và thấy mã đã dùng cùng số tiền được
giảm, nằm giữa tạm tính, phí giao hàng và tổng tiền.

**Why this priority**: Cần cho đối soát và minh bạch với khách, nhưng chỉ có ý nghĩa sau khi P1 hoạt
động.

**Independent Test**: Đặt một đơn có `GIAM50K`, mở trang chi tiết đơn, kiểm tra hiển thị "Giảm giá
(GIAM50K): -50.000 ₫" và tổng tiền khớp với lúc đặt.

**Acceptance Scenarios**:

1. **Given** một đơn đặt với `GIAM50K`, **When** mở trang chi tiết đơn, **Then** thấy mã `GIAM50K`,
   số tiền giảm 50.000 ₫ và tổng tiền đúng như lúc đặt.
2. **Given** một đơn đặt không có mã (kể cả đơn tạo trước khi có tính năng này), **When** mở trang
   chi tiết, **Then** không hiển thị dòng giảm giá và các số tiền vẫn đúng.
3. **Given** một đơn đã đặt với mã, **When** mã đó sau này hết hạn hoặc thay đổi, **Then** số tiền
   giảm trên đơn cũ không thay đổi.

---

### User Story 5 - Không thể gian lận số tiền giảm (Priority: P1)

Một người cố tình sửa số tiền giảm hoặc tổng tiền gửi lên khi đặt hàng, hoặc giữ một mã đã áp dụng
từ trước rồi đặt hàng sau khi mã hết hạn. Hệ thống bỏ qua mọi con số do trình duyệt cung cấp, tự
kiểm tra lại mã và tự tính số tiền giảm tại thời điểm đặt hàng.

**Why this priority**: Rủi ro thất thoát tiền trực tiếp; là yêu cầu bắt buộc từ người yêu cầu và từ
nguyên tắc dự án.

**Independent Test**: Gửi yêu cầu đặt hàng kèm mã `SHOPLITE10` và một số tiền giảm/tổng tiền tự đặt;
kiểm tra đơn được lưu với số tiền do hệ thống tính. Gửi yêu cầu kèm `TET2026` sau ngày hết hạn; kiểm
tra đơn bị từ chối với lý do hết hạn.

**Acceptance Scenarios**:

1. **Given** yêu cầu đặt hàng kèm mã hợp lệ và một con số giảm giá tùy ý, **When** hệ thống xử lý,
   **Then** con số tùy ý bị bỏ qua và đơn được lưu với số tiền giảm do hệ thống tính.
2. **Given** khách đã thấy mã được áp dụng nhưng mã hết hạn trước khi bấm đặt hàng, **When** khách đặt
   hàng, **Then** đơn KHÔNG được tạo; mã vẫn hiển thị ở tóm tắt và ô mã báo "Mã giảm giá đã hết
   hạn"; thông tin khách đã nhập được giữ nguyên.
3. **Given** tình huống ở kịch bản 2, **When** khách bấm "Đặt hàng" lần nữa mà chưa gỡ mã, **Then**
   đơn vẫn không được tạo và lỗi hết hạn vẫn hiển thị.
4. **Given** tình huống ở kịch bản 2, **When** khách bấm "Gỡ mã" rồi bấm "Đặt hàng", **Then** đơn
   được tạo không có giảm giá với tổng tiền khách đã thấy sau khi gỡ.
5. **Given** yêu cầu đặt hàng kèm mã không tồn tại hoặc đơn chưa đạt tối thiểu, **When** hệ thống xử
   lý, **Then** đơn không được tạo và trả về đúng lý do như ở User Story 2.
6. **Given** yêu cầu đặt hàng có hai dòng cùng sản phẩm với số lượng 10 và 1, **When** hệ thống xử lý,
   **Then** đơn không được tạo và trả về lỗi thông tin đơn hàng không hợp lệ.

---

### Edge Cases

- Tạm tính đúng bằng giá trị tối thiểu (300.000đ với `SHOPLITE10`, 500.000đ với `GIAM50K`): mã hợp lệ.
  Thấp hơn 1đ: không hợp lệ, cần mua thêm 1đ.
- `SHOPLITE10` tại tạm tính 1.000.000đ: giảm đúng 100.000đ (10% bằng mức tối đa); tại 1.000.001đ:
  vẫn 100.000đ.
- Phần trăm cho ra số lẻ đồng (ví dụ 10% của 333.335đ = 33.333,5đ): làm tròn xuống thành số đồng
  nguyên (33.333đ).
- Mã giảm số tiền cố định lớn hơn tạm tính: số tiền giảm không vượt quá tạm tính; tổng tiền không
  bao giờ âm.
- Ngày hết hạn: mã còn dùng được hết ngày 28/02/2026 theo giờ Việt Nam; từ 00:00 ngày 01/03/2026 là
  hết hạn.
- Giỏ hàng thay đổi (thêm/bớt/xóa sản phẩm, ở tab khác) sau khi áp dụng mã: số tiền giảm được tính
  lại theo giỏ mới; nếu tạm tính tụt dưới mức tối thiểu thì mã chuyển sang tạm ngưng (giảm 0 ₫, báo
  số tiền cần mua thêm, chặn đặt hàng) và tự có hiệu lực lại khi tạm tính đạt lại mức tối thiểu.
- Tạm tính tụt từ 500.000đ xuống 499.999đ khi đang dùng `GIAM50K`: mã tạm ngưng, cần mua thêm 1 ₫;
  tăng lại đúng 500.000đ: mã có hiệu lực lại.
- Giỏ hàng rỗng: không hiển thị ô mã giảm giá (trang thanh toán vốn không cho đặt hàng khi giỏ rỗng).
- Mã chỉ gồm khoảng trắng: xử lý như ô trống.
- Đổi phương thức giao hàng: không ảnh hưởng số tiền giảm (giảm giá chỉ áp dụng trên tiền hàng).
- Tạm tính 500.000đ dùng `SHOPLITE10` (giảm 50.000đ, còn 450.000đ): vẫn miễn phí giao hàng tiêu chuẩn
  vì mốc miễn phí xét theo tạm tính trước giảm; tạm tính 499.999đ: phí giao hàng tiêu chuẩn 30.000đ.
- Giá sản phẩm trong catalog thay đổi giữa lúc áp dụng và lúc đặt: đơn dùng giá và số tiền giảm tính
  tại thời điểm đặt.
- Hủy đơn đã dùng mã: đơn chuyển sang "Đã hủy" như bình thường; không có giới hạn lượt dùng nên không
  cần hoàn lượt.
- Yêu cầu đặt hàng chứa cùng một sản phẩm ở nhiều dòng (ví dụ 10 + 1): tổng sau khi gộp là 11, vượt
  giới hạn 10 → đơn bị từ chối; không thể dùng dòng trùng để đẩy tạm tính vượt mức tối thiểu của mã.

## Requirements _(mandatory)_

### Functional Requirements

**Định nghĩa và danh sách mã**

- **FR-001**: Hệ thống MUST hỗ trợ hai loại mã: (a) giảm theo phần trăm tiền hàng với mức giảm tối
  đa, (b) giảm một số tiền cố định.
- **FR-002**: Mỗi mã MAY có giá trị tạm tính tối thiểu và ngày hết hạn; mã không có ngày hết hạn thì
  luôn còn hiệu lực, mã không có giá trị tối thiểu thì áp dụng cho mọi giỏ không rỗng.
- **FR-003**: Hệ thống MUST có sẵn ba mã ban đầu:

  | Mã         | Loại      | Mức giảm | Giảm tối đa | Đơn tối thiểu | Hết hạn    |
  | ---------- | --------- | -------- | ----------- | ------------- | ---------- |
  | SHOPLITE10 | Phần trăm | 10%      | 100.000đ    | 300.000đ      | Không      |
  | GIAM50K    | Cố định   | 50.000đ  | —           | 500.000đ      | Không      |
  | TET2026    | Phần trăm | 15%      | 200.000đ    | Không         | 28/02/2026 |

**Nhập và kiểm tra mã**

- **FR-004**: Trang thanh toán MUST có ô "Mã giảm giá" có nhãn và nút "Áp dụng".
- **FR-005**: Mã MUST được so khớp không phân biệt hoa thường và bỏ khoảng trắng đầu/cuối; mã hiển
  thị và lưu dưới dạng chữ in hoa.
- **FR-006**: Khi khách bấm "Áp dụng", hệ thống MUST kiểm tra mã theo thứ tự: tồn tại → còn hạn → đạt
  giá trị tối thiểu, và trả về lý do đầu tiên không đạt.
- **FR-007**: Thông báo lỗi MUST bằng tiếng Việt, hiển thị ngay tại ô mã, và phân biệt được ba
  trường hợp: "Mã giảm giá không tồn tại"; "Mã giảm giá đã hết hạn"; "Đơn hàng chưa đạt giá trị tối
  thiểu {X} để dùng mã này. Mua thêm {Y} để được giảm giá." (X, Y định dạng tiền Việt).
- **FR-008**: Ô trống hoặc chỉ có khoảng trắng MUST báo "Vui lòng nhập mã giảm giá".

**Tính số tiền giảm**

- **FR-009**: Số tiền giảm MUST tính trên tạm tính tiền hàng (trước phí giao hàng):
  - Phần trăm: `min(làm tròn xuống(tạm tính × phần trăm), mức giảm tối đa)`.
  - Cố định: số tiền cố định.
  - Trong mọi trường hợp số tiền giảm MUST không vượt quá tạm tính và là số đồng nguyên không âm.
- **FR-010**: Tổng tiền MUST bằng tạm tính − số tiền giảm + phí giao hàng.
- **FR-011**: Điều kiện miễn phí giao hàng tiêu chuẩn MUST xét theo tạm tính tiền hàng **trước** giảm
  giá; quy tắc phí giao hàng hiện hành MUST giữ nguyên. Ví dụ: giỏ 520.000đ dùng `GIAM50K` → giảm
  50.000đ, phí giao hàng tiêu chuẩn 0đ, tổng 470.000đ.
- **FR-012**: Giá trị tối thiểu của mã MUST so với tạm tính tiền hàng trước giảm giá (≥ là đạt).

**Hiển thị, gỡ mã, một mã mỗi đơn**

- **FR-013**: Khi mã hợp lệ, phần tóm tắt đơn MUST hiển thị dòng "Giảm giá ({MÃ})" với số tiền giảm
  dạng âm và tổng tiền mới, không cần tải lại trang.
- **FR-014**: Mỗi đơn MUST chỉ có tối đa một mã; khi đã áp dụng một mã, khách MUST gỡ mã đó trước khi
  nhập mã khác.
- **FR-015**: Khách MUST gỡ được mã đã áp dụng; sau khi gỡ, tóm tắt trở về giá trị không giảm.
- **FR-016**: Khi giỏ hàng thay đổi sau khi áp dụng mã, số tiền giảm MUST được tính lại. Nếu tạm
  tính tụt dưới giá trị tối thiểu của mã:
  - Mã MUST NOT bị tự gỡ; mã MUST vẫn hiển thị ở trạng thái "tạm ngưng" với số tiền giảm 0 ₫ và lý
    do theo FR-007 (kèm số tiền cần mua thêm).
  - Nút "Đặt hàng" MUST bị chặn khi mã đang tạm ngưng, cho tới khi khách gỡ mã hoặc tạm tính đạt lại
    mức tối thiểu.
  - Khi tạm tính đạt lại mức tối thiểu, mã MUST tự có hiệu lực lại mà khách không phải nhập lại.

**Xác nhận khi đặt hàng (chống gian lận)**

- **FR-017**: Khi đặt hàng, thông tin duy nhất về giảm giá mà trình duyệt gửi lên MUST là mã (nếu có);
  hệ thống MUST bỏ qua mọi số tiền giảm, tạm tính hay tổng tiền từ trình duyệt.
- **FR-018**: Khi đặt hàng, hệ thống MUST kiểm tra lại mã theo FR-005, FR-006 với giá sản phẩm hiện
  hành và thời điểm hiện tại theo đồng hồ của server (giờ Việt Nam, UTC+7); MUST NOT dùng thời gian do
  trình duyệt cung cấp. Cùng một thời điểm MUST được dùng cho việc xét hạn mã và thời điểm tạo đơn. Sau
  đó hệ thống tự tính số tiền giảm và tổng tiền theo FR-009 – FR-012.
- **FR-019**: Nếu mã không hợp lệ tại thời điểm đặt hàng, hệ thống MUST từ chối tạo đơn và trả về đúng
  lý do theo FR-007; MUST NOT tự động tạo đơn không có giảm giá. Trang thanh toán MUST giữ mã trong
  tóm tắt, hiển thị lý do tại ô mã và giữ nguyên thông tin khách đã nhập; hệ thống MUST NOT tự gỡ mã
  trong trường hợp này. Khách MUST tự bấm "Gỡ mã" trước khi có thể đặt hàng không có giảm giá.
- **FR-023**: Khi đặt hàng, sau khi gộp các dòng trùng sản phẩm, số lượng của mỗi sản phẩm MUST không
  vượt quá giới hạn 10 sản phẩm mỗi loại và tồn kho hiện có; vượt giới hạn → từ chối tạo đơn với lỗi
  thông tin đơn hàng không hợp lệ. Quy tắc này áp dụng cho mọi đơn, có hoặc không dùng mã.

**Lưu và hiển thị trên đơn hàng**

- **FR-020**: Đơn hàng có dùng mã MUST lưu mã đã dùng và số tiền được giảm tại thời điểm đặt; các giá
  trị này MUST NOT thay đổi khi mã bị sửa hoặc hết hạn sau đó.
- **FR-021**: Trang chi tiết đơn hàng MUST hiển thị dòng "Giảm giá ({MÃ})" với số tiền giảm khi đơn
  có dùng mã, và không hiển thị dòng này khi đơn không dùng mã.
- **FR-022**: Đơn hàng tạo trước khi có tính năng MUST tiếp tục hiển thị và hủy được như trước (coi
  như không có giảm giá).

### Key Entities

- **Mã giảm giá (Discount Code)**: chương trình khuyến mãi khách nhập tay. Thuộc tính: mã (duy nhất,
  in hoa), loại (phần trăm / cố định), giá trị giảm (phần trăm hoặc số tiền), mức giảm tối đa (chỉ
  loại phần trăm), giá trị tạm tính tối thiểu (tùy chọn), ngày hết hạn (tùy chọn, tính hết ngày theo
  giờ Việt Nam). Danh sách mã cố định, do đội phát triển cấu hình.
- **Kết quả kiểm tra mã**: hợp lệ (kèm số tiền giảm) hoặc không hợp lệ (kèm lý do: không tồn tại /
  hết hạn / chưa đạt tối thiểu kèm số tiền tối thiểu và số tiền cần mua thêm).
- **Mã đang áp dụng trên trang thanh toán**: mã khách đã áp dụng thành công, ở một trong ba trạng thái:
  - "đang hiệu lực": có số tiền giảm, đặt hàng được.
  - "tạm ngưng": giảm 0 ₫ vì tạm tính chưa đạt tối thiểu; không đặt hàng được; tự về "đang hiệu lực"
    khi tạm tính đạt lại mức tối thiểu (FR-016).
  - "bị chặn": giảm 0 ₫ vì lần đặt hàng bị từ chối do mã không hợp lệ, hoặc trình duyệt phát hiện mã đã
    hết hạn; không đặt hàng được; chỉ thoát khi khách bấm "Gỡ mã" (FR-019).
- **Đơn hàng (mở rộng)**: thêm mã đã dùng (tùy chọn) và số tiền giảm (mặc định 0) bên cạnh tạm tính,
  phí giao hàng và tổng tiền.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Khách áp dụng mã hợp lệ và thấy số tiền giảm cùng tổng tiền mới trong vòng 1 giây sau
  khi bấm "Áp dụng".
- **SC-002**: 100% đơn hàng có mã được lưu với số tiền giảm và tổng tiền khớp với cách tính ở FR-009 –
  FR-012, kể cả khi trình duyệt gửi số liệu bị sửa.
- **SC-003**: 100% trường hợp mã không hợp lệ hiển thị đúng một trong ba lý do đã định nghĩa; trường
  hợp chưa đạt tối thiểu luôn hiển thị đúng số tiền cần mua thêm.
- **SC-004**: Tất cả giá trị biên trong Edge Cases (đúng bằng/thấp hơn tối thiểu, chạm mức giảm tối
  đa, làm tròn, ngày cuối hiệu lực, giảm vượt tạm tính) cho kết quả đúng như mô tả.
- **SC-005**: Khách hoàn tất áp dụng mã và đặt hàng mà không cần rời trang thanh toán; thời gian thanh
  toán tăng thêm không quá 15 giây so với đặt hàng không dùng mã.
- **SC-006** (kinh doanh, đo sau phát hành): marketing theo dõi được số đơn và tổng tiền giảm theo
  từng mã từ dữ liệu đơn hàng, làm cơ sở đánh giá tỷ lệ chốt đơn và giá trị trung bình mỗi đơn.

## Assumptions

- Khách hàng không cần đăng nhập (ShopLite chưa có tài khoản); mã dùng được cho mọi khách.
- Danh sách mã cố định, thay đổi bằng cách cập nhật cấu hình và phát hành lại; không có trang quản trị
  (ngoài phạm vi).
- Không giới hạn số lượt dùng mỗi mã và không có mã riêng cho từng khách (ngoài phạm vi); vì vậy hủy
  đơn không cần hoàn lượt.
- Giảm giá chỉ áp dụng trên tiền hàng, không giảm phí giao hàng.
- Phần trăm làm tròn xuống đồng nguyên để không bao giờ giảm quá mức công bố.
- Mã không có ngày bắt đầu hiệu lực; mã có hiệu lực ngay khi được cấu hình.
- Ngày hết hạn tính theo giờ Việt Nam (UTC+7), hiệu lực đến hết 23:59:59 ngày hết hạn.
- Mã đã áp dụng chỉ được giữ trong phiên thanh toán hiện tại trên trình duyệt; không cần đồng bộ giữa
  các thiết bị.
- Trang danh sách đơn hàng tiếp tục hiển thị tổng tiền cuối cùng (đã trừ giảm giá); không bắt buộc
  hiển thị mã ở danh sách.
- Đơn hàng hiện có (không có thông tin giảm giá) vẫn hợp lệ và được coi là giảm 0đ.
