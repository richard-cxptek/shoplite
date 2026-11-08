# Spec Delta

## Purpose

Cho khách lưu lại các sản phẩm đang quan tâm vào một danh sách yêu thích riêng, ngay trên trình duyệt và không cần đăng nhập, để quay lại so sánh và mua sau mà không phải bỏ tạm vào giỏ hàng.

## ADDED Requirements

### Requirement: Bật/tắt yêu thích từ thẻ sản phẩm và trang chi tiết

Hệ thống SHALL hiển thị một nút trái tim trên mọi thẻ sản phẩm và ở trang chi tiết sản phẩm. Khi sản phẩm chưa có trong danh sách, bấm nút SHALL thêm sản phẩm vào danh sách. Khi sản phẩm đã có, bấm nút SHALL bỏ sản phẩm khỏi danh sách. Một sản phẩm MUST xuất hiện tối đa một lần trong danh sách. Sản phẩm hết hàng SHALL vẫn được thêm vào danh sách.

#### Scenario: Thêm sản phẩm vào danh sách yêu thích

- **WHEN** khách bấm nút trái tim trên thẻ của một sản phẩm chưa có trong danh sách
- **THEN** sản phẩm được thêm vào danh sách và nút chuyển sang trạng thái "đã thích"

#### Scenario: Bấm lần nữa để bỏ thích

- **WHEN** khách bấm nút trái tim của một sản phẩm đang ở trạng thái "đã thích"
- **THEN** sản phẩm bị bỏ khỏi danh sách và nút trở về trạng thái "chưa thích"

#### Scenario: Thẻ sản phẩm và trang chi tiết dùng chung một trạng thái

- **WHEN** khách thích một sản phẩm từ thẻ ở trang danh mục rồi mở trang chi tiết của sản phẩm đó
- **THEN** nút trái tim ở trang chi tiết hiển thị trạng thái "đã thích"; bấm vào đó sẽ bỏ thích và danh sách không chứa sản phẩm này

#### Scenario: Thích sản phẩm hết hàng

- **WHEN** khách bấm nút trái tim của một sản phẩm có tồn kho bằng 0
- **THEN** sản phẩm được thêm vào danh sách như bình thường

#### Scenario: Bấm nút tim không kích hoạt điều hướng hay thêm vào giỏ

- **WHEN** khách bấm nút trái tim trên thẻ sản phẩm
- **THEN** trang không chuyển sang trang chi tiết và giỏ hàng không thay đổi

### Requirement: Trạng thái "đã thích" rõ ràng với mắt thường và screen reader

Nút trái tim SHALL thể hiện hai trạng thái khác biệt về hình ảnh (tim tô đầy màu khi đã thích, tim viền khi chưa thích). Nút MUST là một nút bật/tắt có tên truy cập chứa tên sản phẩm và MUST thông báo trạng thái bật/tắt cho công nghệ hỗ trợ. Nút MUST dùng được bằng bàn phím. Trước khi đọc xong dữ liệu đã lưu, nút MUST NOT hiển thị sai trạng thái "đã thích".

#### Scenario: Screen reader đọc được trạng thái

- **WHEN** công nghệ hỗ trợ truy cập nút trái tim của một sản phẩm đã thích
- **THEN** nút được công bố là nút bật/tắt đang ở trạng thái bật, có tên chứa tên sản phẩm (ví dụ "Yêu thích Tai nghe không dây SoundMax Pro")

#### Scenario: Thao tác bằng bàn phím

- **WHEN** khách dùng phím Tab để focus vào nút trái tim rồi nhấn Enter hoặc Space
- **THEN** trạng thái yêu thích của sản phẩm được bật/tắt giống như khi bấm chuột

#### Scenario: Lần render đầu trước khi đọc dữ liệu đã lưu

- **WHEN** trang được render lần đầu (phía server hoặc trước khi đọc xong dữ liệu trình duyệt)
- **THEN** nút hiển thị ở trạng thái "chưa thích" và không gây lệch hydrate; sau khi đọc dữ liệu, nút cập nhật đúng trạng thái đã lưu

### Requirement: Giới hạn tối đa 50 sản phẩm

Danh sách yêu thích MUST chứa tối đa 50 sản phẩm. Khi danh sách đã có 50 sản phẩm và khách cố thích thêm một sản phẩm mới, hệ thống SHALL giữ nguyên danh sách và SHALL hiển thị thông báo cho biết danh sách đã đầy. Thông báo này MUST được công bố cho screen reader. Việc bỏ thích MUST luôn thực hiện được khi danh sách đầy.

#### Scenario: Thêm sản phẩm thứ 50

- **WHEN** danh sách có 49 sản phẩm và khách thích thêm một sản phẩm mới
- **THEN** sản phẩm được thêm, danh sách có 50 sản phẩm và không có thông báo đầy

#### Scenario: Thích thêm khi danh sách đã đầy

- **WHEN** danh sách có 50 sản phẩm và khách bấm nút trái tim của một sản phẩm chưa có trong danh sách
- **THEN** danh sách vẫn giữ nguyên 50 sản phẩm, nút vẫn ở trạng thái "chưa thích" và hiển thị thông báo "Danh sách yêu thích đã đầy (tối đa 50 sản phẩm). Hãy bỏ bớt để thêm sản phẩm mới."

#### Scenario: Bỏ thích khi danh sách đã đầy

- **WHEN** danh sách có 50 sản phẩm và khách bỏ thích một sản phẩm trong đó
- **THEN** sản phẩm bị bỏ khỏi danh sách, còn 49 sản phẩm, và khách có thể thích một sản phẩm khác

### Requirement: Lưu danh sách trên trình duyệt

Danh sách yêu thích SHALL được lưu trên trình duyệt của khách, không cần đăng nhập. Danh sách MUST giữ nguyên sau khi tải lại trang. Hệ thống MUST chỉ lưu định danh sản phẩm và thứ tự thêm, không lưu giá hay tồn kho. Dữ liệu lưu bị hỏng hoặc sai định dạng MUST NOT làm hỏng trang.

#### Scenario: Giữ nguyên sau khi tải lại trang

- **WHEN** khách thích 2 sản phẩm rồi tải lại trang
- **THEN** cả 2 sản phẩm vẫn ở trạng thái "đã thích" và vẫn có trong danh sách

#### Scenario: Dữ liệu lưu bị hỏng

- **WHEN** dữ liệu wishlist trong bộ nhớ trình duyệt không phải JSON hợp lệ hoặc sai cấu trúc
- **THEN** hệ thống coi danh sách là rỗng, trang hiển thị bình thường và lần thích tiếp theo ghi đè dữ liệu hỏng

#### Scenario: Dữ liệu lưu bị trùng hoặc vượt giới hạn

- **WHEN** dữ liệu lưu chứa một sản phẩm lặp lại nhiều lần hoặc có hơn 50 sản phẩm
- **THEN** hệ thống chỉ giữ mỗi sản phẩm một lần và tối đa 50 sản phẩm thêm gần nhất

#### Scenario: Trình duyệt chặn bộ nhớ cục bộ

- **WHEN** trình duyệt không cho ghi bộ nhớ cục bộ (ví dụ chế độ ẩn danh chặn lưu trữ)
- **THEN** nút trái tim vẫn hoạt động trong phiên hiện tại và trang không báo lỗi

### Requirement: Đồng bộ giữa các tab đang mở

Khi danh sách yêu thích thay đổi ở một tab, mọi tab khác của cùng trình duyệt đang mở ShopLite SHALL cập nhật trạng thái nút trái tim, số đếm ở header và trang `/wishlist` mà không cần tải lại.

#### Scenario: Thích ở tab A, tab B cập nhật

- **WHEN** khách mở 2 tab và thích một sản phẩm ở tab A
- **THEN** ở tab B, nút trái tim của sản phẩm đó chuyển sang "đã thích" và số đếm ở header tăng thêm 1

#### Scenario: Xóa dữ liệu ở tab khác

- **WHEN** dữ liệu wishlist bị xóa hoặc hỏng do thao tác ở tab khác
- **THEN** tab hiện tại hiển thị danh sách rỗng, không báo lỗi

### Requirement: Chỉ báo yêu thích ở header

Header SHALL có một liên kết biểu tượng trái tim dẫn tới `/wishlist`, hiển thị ở mọi trang. Khi danh sách có ít nhất 1 sản phẩm, liên kết SHALL hiển thị số lượng sản phẩm và tên truy cập MUST chứa số lượng đó. Khi danh sách rỗng hoặc chưa đọc xong dữ liệu đã lưu, liên kết MUST NOT hiển thị con số.

#### Scenario: Hiển thị số lượng

- **WHEN** danh sách có 3 sản phẩm
- **THEN** header hiển thị số "3" cạnh biểu tượng trái tim và tên truy cập của liên kết là "Danh sách yêu thích (3 sản phẩm)"

#### Scenario: Danh sách rỗng

- **WHEN** danh sách không có sản phẩm nào
- **THEN** header chỉ hiển thị biểu tượng trái tim, không có con số, tên truy cập là "Danh sách yêu thích"

#### Scenario: Mở trang danh sách

- **WHEN** khách bấm biểu tượng trái tim ở header
- **THEN** trình duyệt chuyển tới trang `/wishlist`

### Requirement: Trang /wishlist hiển thị số liệu mới nhất

Trang `/wishlist` SHALL liệt kê các sản phẩm trong danh sách, sản phẩm thêm gần nhất đứng đầu. Mỗi sản phẩm hiển thị ảnh, tên (liên kết tới trang chi tiết), giá và trạng thái tồn kho. Giá và tồn kho MUST lấy từ catalog tại thời điểm hiển thị, không lấy từ lúc khách thích. Sản phẩm không còn trong catalog MUST NOT hiển thị và SHALL bị loại khỏi danh sách.

#### Scenario: Giá thay đổi sau khi thích

- **WHEN** khách thích một sản phẩm giá 1.290.000đ, sau đó giá trong catalog đổi thành 1.190.000đ, rồi khách mở `/wishlist`
- **THEN** trang hiển thị giá 1.190.000đ

#### Scenario: Thứ tự hiển thị

- **WHEN** khách thích lần lượt sản phẩm A rồi sản phẩm B
- **THEN** trang `/wishlist` hiển thị B trước A

#### Scenario: Sản phẩm không còn trong catalog

- **WHEN** danh sách đã lưu chứa định danh của một sản phẩm không có trong catalog
- **THEN** trang không hiển thị dòng nào cho sản phẩm đó, và định danh đó bị loại khỏi danh sách (số đếm ở header giảm tương ứng)

### Requirement: Bỏ thích và thêm vào giỏ từ trang /wishlist

Mỗi sản phẩm trên trang `/wishlist` SHALL có nút "Bỏ thích" để bỏ sản phẩm khỏi danh sách và nút "Thêm vào giỏ" để thêm 1 sản phẩm vào giỏ hàng. Thêm vào giỏ MUST tuân theo giới hạn hiện có của giỏ hàng (tối đa 10 mỗi sản phẩm, không vượt tồn kho) và MUST NOT bỏ sản phẩm khỏi danh sách yêu thích.

#### Scenario: Bỏ thích từ trang danh sách

- **WHEN** khách bấm "Bỏ thích" ở một sản phẩm trên `/wishlist`
- **THEN** sản phẩm biến mất khỏi trang và số đếm ở header giảm 1

#### Scenario: Thêm vào giỏ từ trang danh sách

- **WHEN** khách bấm "Thêm vào giỏ" ở một sản phẩm còn hàng trên `/wishlist`
- **THEN** giỏ hàng có thêm 1 sản phẩm đó, số đếm giỏ hàng tăng, và sản phẩm vẫn nằm trong danh sách yêu thích

#### Scenario: Giỏ đã đạt số lượng tối đa của sản phẩm

- **WHEN** giỏ hàng đã có số lượng tối đa cho phép của một sản phẩm trên `/wishlist`
- **THEN** nút thêm vào giỏ của sản phẩm đó bị vô hiệu hóa và giỏ hàng không thay đổi

### Requirement: Sản phẩm hết hàng trong danh sách yêu thích

Sản phẩm có tồn kho bằng 0 SHALL vẫn nằm trong danh sách yêu thích và hiển thị nhãn "Hết hàng" trên trang `/wishlist`. Nút thêm vào giỏ của sản phẩm đó MUST bị vô hiệu hóa. Nút "Bỏ thích" MUST vẫn dùng được.

#### Scenario: Hiển thị sản phẩm hết hàng

- **WHEN** danh sách chứa một sản phẩm có tồn kho bằng 0 và khách mở `/wishlist`
- **THEN** sản phẩm được liệt kê với nhãn "Hết hàng" và nút thêm vào giỏ ở trạng thái vô hiệu hóa

#### Scenario: Không thêm được sản phẩm hết hàng vào giỏ

- **WHEN** khách cố kích hoạt nút thêm vào giỏ của sản phẩm hết hàng trên `/wishlist`
- **THEN** giỏ hàng không thay đổi

#### Scenario: Bỏ thích sản phẩm hết hàng

- **WHEN** khách bấm "Bỏ thích" ở sản phẩm hết hàng
- **THEN** sản phẩm bị bỏ khỏi danh sách

### Requirement: Trạng thái trống của trang /wishlist

Khi danh sách yêu thích không có sản phẩm nào hiển thị được, trang `/wishlist` SHALL hiển thị trạng thái trống, gồm lời giải thích và liên kết mời khám phá sản phẩm dẫn tới `/products`. Trước khi đọc xong dữ liệu đã lưu, trang MUST NOT hiển thị trạng thái trống.

#### Scenario: Chưa thích sản phẩm nào

- **WHEN** khách chưa thích sản phẩm nào và mở `/wishlist`
- **THEN** trang hiển thị "Danh sách yêu thích đang trống" cùng liên kết "Khám phá sản phẩm" dẫn tới `/products`

#### Scenario: Bỏ thích sản phẩm cuối cùng

- **WHEN** danh sách còn đúng 1 sản phẩm và khách bấm "Bỏ thích" trên `/wishlist`
- **THEN** trang chuyển sang trạng thái trống mà không cần tải lại

#### Scenario: Đang đọc dữ liệu đã lưu

- **WHEN** trang `/wishlist` render lần đầu, trước khi đọc xong dữ liệu trình duyệt
- **THEN** trang hiển thị khung chờ (skeleton) thay vì trạng thái trống
