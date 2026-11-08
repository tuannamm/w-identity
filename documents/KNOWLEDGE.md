# Clean Architecture — học, ôn tập và phỏng vấn

Ví dụ xuyên suốt là thiết kế và code **w-identity** đã có kiểm thử; đây chưa phải bằng chứng vận hành production. Xem [PLAN.md](./PLAN.md).

Học theo thứ tự 0–13. Mỗi ngày đọc hai chủ đề, tự nói câu trả lời trong 60–90 giây rồi luyện thẻ câu hỏi. Cuối tuần làm bài thực hành và một buổi phỏng vấn giả lập 20 phút. Trạng thái 📖 là tài liệu lý thuyết, không khẳng định bạn đã học thuộc.

## Bảng tiến độ

| # | Chủ đề | Bước PLAN | Trạng thái |
|---|---|---|---|
| 0 | Clean Architecture trong 60 giây | Clean Architecture | 📖 |
| 1 | Dependency Rule và luồng thực thi | Clean Architecture | 📖 |
| 2 | Domain: mô hình và quy tắc | Clean Architecture | 📖 |
| 3 | Application và use case | Clean Architecture | 📖 |
| 4 | Ports, adapters và quyền sở hữu interface | Clean Architecture | 📖 |
| 5 | DIP, DI và composition root | Clean Architecture | 📖 |
| 6 | DTO, mapper và ranh giới dữ liệu | Clean Architecture | 📖 |
| 7 | Validation và authorization nằm ở đâu | Clean Architecture | 📖 |
| 8 | Lỗi, timeout và kết quả chưa xác định | Clean Architecture | 📖 |
| 9 | Transaction và tính nhất quán giữa hai hệ thống | Clean Architecture | 📖 |
| 10 | Chiến lược kiểm thử | Clean Architecture | 📖 |
| 11 | Clean, Hexagonal, Onion và layered architecture | Clean Architecture | 📖 |
| 12 | Đánh đổi và khi nào áp dụng | Clean Architecture | 📖 |
| 13 | Bài thực hành và câu trả lời phỏng vấn | Clean Architecture | 📖 |

## 0. Clean Architecture trong 60 giây

Tách quy tắc nghiệp vụ khỏi chi tiết giao tiếp và lưu trữ để kiểm thử và thay đổi độc lập. Điều quyết định là hướng phụ thuộc trong mã nguồn, không phải số thư mục.

**Ví dụ w-identity:** Trong thiết kế w-identity, use case cập nhật hồ sơ dùng repository port; Mongoose nằm ở adapter bên ngoài.

**Bẫy phỏng vấn:** Chia đủ bốn folder nhưng application vẫn import Mongoose thì ranh giới chưa đúng.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 1. Dependency Rule và luồng thực thi

Dependency trong mã nguồn hướng về phần nghiệp vụ bên trong. Luồng chạy có thể đi từ use case ra adapter qua interface do lớp trong sở hữu.

**Ví dụ w-identity:** Application định nghĩa UserProfileRepositoryPort; infrastructure implements port. Khi chạy, use case gọi adapter được truyền vào constructor.

**Bẫy phỏng vấn:** Nhầm chiều gọi hàm với chiều import; nghĩ use case không được gọi database thông qua port.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 2. Domain: mô hình và quy tắc

Domain diễn tả khái niệm và bất biến nghiệp vụ. Entity không bắt buộc là class; có thể dùng kiểu dữ liệu và hàm thuần khi phù hợp.

**Ví dụ w-identity:** UserProfile mô tả hồ sơ; policy chỉ chấp nhận role ứng dụng admin và user. Không đưa schema Mongoose vào domain.

**Bẫy phỏng vấn:** Đưa mọi validation vào entity hoặc tạo class rỗng chỉ để gọi là DDD.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 3. Application và use case

Use case mô tả một mục đích của người dùng, điều phối domain và ports, kiểm tra quyền và quyết định thứ tự thao tác.

**Ví dụ w-identity:** SetUserStatus kiểm tra admin, đổi trạng thái tài khoản rồi kết thúc session khi khóa.

**Bẫy phỏng vấn:** Tạo UserService khổng lồ hoặc để controller điều phối nhiều adapter.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 4. Ports, adapters và quyền sở hữu interface

Port là hợp đồng lớp nghiệp vụ cần; adapter chuyển hợp đồng đó thành lời gọi công nghệ cụ thể. Interface nên nói bằng ngôn ngữ của bên sử dụng.

**Ví dụ w-identity:** IdentityProviderPort cung cấp getUser, createUser; KeycloakIdentityAdapter chuyển UserRepresentation sang UserAccount.

**Bẫy phỏng vấn:** Định nghĩa port trả Keycloak SDK object khiến abstraction vẫn rò rỉ nhà cung cấp.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 5. DIP, DI và composition root

DIP là nguyên tắc phụ thuộc vào abstraction; DI là cách cung cấp dependency từ ngoài. Composition root chọn implementation và lắp object graph. DI không tự bảo đảm DIP.

**Ví dụ w-identity:** Use case nhận port qua constructor thuần; Nest factory provider ở bootstrap truyền adapter vào. Interface TypeScript bị xóa khi chạy nên cần runtime token.

**Bẫy phỏng vấn:** Inject Mongoose Model trực tiếp vào use case vẫn gắn use case với database dù đã dùng DI.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 6. DTO, mapper và ranh giới dữ liệu

DTO giao tiếp, mô hình nội bộ và document lưu trữ có mục đích khác nhau. Mapper chỉ cần khi có ranh giới thật hoặc hình dạng khác nhau.

**Ví dụ w-identity:** GatewayRequest.user được chuyển thành Actor; MongoDB _id không xuất hiện trong response API.

**Bẫy phỏng vấn:** Trả nguyên document hoặc token Keycloak; ngược lại tạo mapper giống hệt ở mọi hàm gây dư thừa.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 7. Validation và authorization nằm ở đâu

Presentation kiểm tra kiểu/định dạng dữ liệu; application kiểm tra quyền và điều phối; domain bảo vệ bất biến. Kiểm tra ở biên không thay thế kiểm tra nghiệp vụ.

**Ví dụ w-identity:** Gateway xác minh JWT; GetMe lấy ID từ actor, không nhận ID người khác trong body. Use case admin kiểm tra role trước khi gọi port.

**Bẫy phỏng vấn:** Chỉ dùng guard ở controller rồi nghĩ use case an toàn khi được gọi từ transport khác.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 8. Lỗi, timeout và kết quả chưa xác định

Lỗi application có mã ổn định, không chứa HTTP/RPC exception. Adapter chuyển lỗi kỹ thuật; presentation ánh xạ ra giao thức. Timeout không chứng minh thao tác chưa xảy ra.

**Ví dụ w-identity:** Tạo user thành công nhưng gán role lỗi: trả thông tin user đã tạo. TCP filter chuyển sang GatewayRpcError; không tự tạo lại user.

**Bẫy phỏng vấn:** Catch mọi lỗi rồi trả 500; retry POST mù quáng có thể tạo tác dụng phụ trùng.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 9. Transaction và tính nhất quán giữa hai hệ thống

Clean Architecture không cung cấp distributed transaction. Cần quyết định nguồn dữ liệu chuẩn, ranh giới ghi và chiến lược lỗi từng phần.

**Ví dụ w-identity:** Keycloak giữ tài khoản; MongoDB giữ hồ sơ tạo lười. Không cố dùng MongoDB transaction để rollback lời gọi Keycloak.

**Bẫy phỏng vấn:** Tưởng thêm repository là có atomicity giữa Keycloak và MongoDB. Outbox/saga chỉ thêm khi yêu cầu và hạ tầng phù hợp.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 10. Chiến lược kiểm thử

Kiểm thử nghiệp vụ bằng fake ports; adapter bằng integration test; TCP mapping bằng controller test; các luồng chính bằng E2E. Thêm kiểm tra import để giữ ranh giới.

**Ví dụ w-identity:** GetMe dùng fake identity provider và profile repository, không cần Nest container. Integration test riêng kiểm tra unique index và upsert đồng thời.

**Bẫy phỏng vấn:** Mock quá sâu từng lời gọi private; chỉ có fake test nên không phát hiện adapter sai hợp đồng.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 11. Clean, Hexagonal, Onion và layered architecture

Các cách tiếp cận đều nhấn mạnh tách nghiệp vụ và chi tiết nhưng mô tả ranh giới khác nhau. Layered truyền thống có thể để service phụ thuộc implementation database; Clean dùng đảo phụ thuộc ở ranh giới đó.

**Ví dụ w-identity:** Cùng dịch vụ có thể giải thích theo ports/adapters hoặc các vòng domain/application. REST hay TCP không quyết định kiến trúc.

**Bẫy phỏng vấn:** Đồng nhất Clean Architecture với microservices, DDD hoặc bắt buộc CQRS. Monolith cũng áp dụng được.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 12. Đánh đổi và khi nào áp dụng

Ranh giới thêm interface, mapping và chi phí điều hướng. Hữu ích khi nghiệp vụ phức tạp, nhiều tích hợp hoặc sống lâu; CRUD nhỏ có thể dùng cấu trúc nhẹ hơn.

**Ví dụ w-identity:** w-identity có Keycloak và MongoDB nên tách adapter có giá trị; giữ mọi lớp trong app thay vì tạo nhiều Nx libraries ngay.

**Bẫy phỏng vấn:** Hứa đổi database không tốn công: vẫn phải xử lý query, schema, migration và đặc tính consistency.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## 13. Bài thực hành và câu trả lời phỏng vấn

Bài tập: thiết kế UpdateMyProfile với input, Actor, hai ports, lỗi và test. Sau đó giả lập Keycloak timeout, MongoDB down và request của user khác.

**Ví dụ w-identity:** Mẫu nói: Em tách use case khỏi Keycloak/Mongoose bằng ports, lắp bằng Nest providers. Đánh đổi là thêm mapping; lợi ích là test nghiệp vụ độc lập. Chỉ mô tả phần bạn hiểu và đã tự kiểm chứng; không xem kiểm thử local là kinh nghiệm vận hành production.

**Bẫy phỏng vấn:** Kể thiết kế dự kiến như thành tích đã làm; chỉ kể tên thư mục mà không mô tả dependency và trade-off.

**Tự trả lời:** viết lại bằng lời của bạn, nêu một đánh đổi và một tình huống kiểm thử.

## Từ điển nhanh

| Thuật ngữ | Giải thích |
|---|---|
| Dependency Rule | Phụ thuộc mã nguồn hướng vào nghiệp vụ bên trong |
| Use case | Một mục đích nghiệp vụ mà hệ thống thực hiện |
| Port | Hợp đồng tương tác do lớp sử dụng sở hữu |
| Adapter | Hiện thực port bằng công nghệ cụ thể |
| DIP | Đảo phụ thuộc từ implementation sang abstraction |
| DI | Cung cấp dependency từ bên ngoài |
| Composition root | Nơi chọn và lắp các implementation |
| Actor | Ngữ cảnh danh tính người thực hiện đã được xác minh |
| DTO | Dữ liệu dùng ở biên giao tiếp |
| Mapper | Chuyển đổi giữa các mô hình dữ liệu |
| Fake | Implementation đơn giản dùng kiểm thử hành vi |
| Partial failure | Một phần chuỗi thao tác thành công, phần khác thất bại |

## Nguồn và cách dùng

Nguyên tắc nền tảng: [Robert C. Martin — The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html). Cách chia folder, Actor, DI tokens và ports ở đây là lựa chọn thiết kế cho w-identity, không phải quy định duy nhất của Clean Architecture.
