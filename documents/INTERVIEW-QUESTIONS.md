# Câu hỏi phỏng vấn Clean Architecture

Che đáp án, nói thành tiếng 60–90 giây: định nghĩa → đánh đổi → ví dụ. Chỉ đánh dấu đã thuộc khi giải thích được câu hỏi phụ.

## Phần A. Kiến thức nền

- [ ] 🟢 Giải thích: Clean Architecture trong 60 giây? · 📚 #0
  *Ý chính:* Tách quy tắc nghiệp vụ khỏi chi tiết giao tiếp và lưu trữ để kiểm thử và thay đổi độc lập. Điều quyết định là hướng phụ thuộc trong mã nguồn, không phải số thư mục. Chia đủ bốn folder nhưng application vẫn import Mongoose thì ranh giới chưa đúng.
- [ ] 🟢 Giải thích: Dependency Rule và luồng thực thi? · 📚 #1
  *Ý chính:* Dependency trong mã nguồn hướng về phần nghiệp vụ bên trong. Luồng chạy có thể đi từ use case ra adapter qua interface do lớp trong sở hữu. Nhầm chiều gọi hàm với chiều import; nghĩ use case không được gọi database thông qua port.
- [ ] 🟢 Giải thích: Domain: mô hình và quy tắc? · 📚 #2
  *Ý chính:* Domain diễn tả khái niệm và bất biến nghiệp vụ. Entity không bắt buộc là class; có thể dùng kiểu dữ liệu và hàm thuần khi phù hợp. Đưa mọi validation vào entity hoặc tạo class rỗng chỉ để gọi là DDD.
- [ ] 🟢 Giải thích: Application và use case? · 📚 #3
  *Ý chính:* Use case mô tả một mục đích của người dùng, điều phối domain và ports, kiểm tra quyền và quyết định thứ tự thao tác. Tạo UserService khổng lồ hoặc để controller điều phối nhiều adapter.
- [ ] 🟡 Giải thích: Ports, adapters và quyền sở hữu interface? · 📚 #4
  *Ý chính:* Port là hợp đồng lớp nghiệp vụ cần; adapter chuyển hợp đồng đó thành lời gọi công nghệ cụ thể. Interface nên nói bằng ngôn ngữ của bên sử dụng. Định nghĩa port trả Keycloak SDK object khiến abstraction vẫn rò rỉ nhà cung cấp.
- [ ] 🟡 Giải thích: DIP, DI và composition root? · 📚 #5
  *Ý chính:* DIP là nguyên tắc phụ thuộc vào abstraction; DI là cách cung cấp dependency từ ngoài. Composition root chọn implementation và lắp object graph. DI không tự bảo đảm DIP. Inject Mongoose Model trực tiếp vào use case vẫn gắn use case với database dù đã dùng DI.
- [ ] 🟡 Giải thích: DTO, mapper và ranh giới dữ liệu? · 📚 #6
  *Ý chính:* DTO giao tiếp, mô hình nội bộ và document lưu trữ có mục đích khác nhau. Mapper chỉ cần khi có ranh giới thật hoặc hình dạng khác nhau. Trả nguyên document hoặc token Keycloak; ngược lại tạo mapper giống hệt ở mọi hàm gây dư thừa.
- [ ] 🟡 Giải thích: Validation và authorization nằm ở đâu? · 📚 #7
  *Ý chính:* Presentation kiểm tra kiểu/định dạng dữ liệu; application kiểm tra quyền và điều phối; domain bảo vệ bất biến. Kiểm tra ở biên không thay thế kiểm tra nghiệp vụ. Chỉ dùng guard ở controller rồi nghĩ use case an toàn khi được gọi từ transport khác.
- [ ] 🟡 Giải thích: Lỗi, timeout và kết quả chưa xác định? · 📚 #8
  *Ý chính:* Lỗi application có mã ổn định, không chứa HTTP/RPC exception. Adapter chuyển lỗi kỹ thuật; presentation ánh xạ ra giao thức. Timeout không chứng minh thao tác chưa xảy ra. Catch mọi lỗi rồi trả 500; retry POST mù quáng có thể tạo tác dụng phụ trùng.
- [ ] 🟡 Giải thích: Transaction và tính nhất quán giữa hai hệ thống? · 📚 #9
  *Ý chính:* Clean Architecture không cung cấp distributed transaction. Cần quyết định nguồn dữ liệu chuẩn, ranh giới ghi và chiến lược lỗi từng phần. Tưởng thêm repository là có atomicity giữa Keycloak và MongoDB. Outbox/saga chỉ thêm khi yêu cầu và hạ tầng phù hợp.
- [ ] 🟡 Giải thích: Chiến lược kiểm thử? · 📚 #10
  *Ý chính:* Kiểm thử nghiệp vụ bằng fake ports; adapter bằng integration test; TCP mapping bằng controller test; các luồng chính bằng E2E. Thêm kiểm tra import để giữ ranh giới. Mock quá sâu từng lời gọi private; chỉ có fake test nên không phát hiện adapter sai hợp đồng.
- [ ] 🟡 Giải thích: Clean, Hexagonal, Onion và layered architecture? · 📚 #11
  *Ý chính:* Các cách tiếp cận đều nhấn mạnh tách nghiệp vụ và chi tiết nhưng mô tả ranh giới khác nhau. Layered truyền thống có thể để service phụ thuộc implementation database; Clean dùng đảo phụ thuộc ở ranh giới đó. Đồng nhất Clean Architecture với microservices, DDD hoặc bắt buộc CQRS. Monolith cũng áp dụng được.
- [ ] 🟡 Giải thích: Đánh đổi và khi nào áp dụng? · 📚 #12
  *Ý chính:* Ranh giới thêm interface, mapping và chi phí điều hướng. Hữu ích khi nghiệp vụ phức tạp, nhiều tích hợp hoặc sống lâu; CRUD nhỏ có thể dùng cấu trúc nhẹ hơn. Hứa đổi database không tốn công: vẫn phải xử lý query, schema, migration và đặc tính consistency.
- [ ] 🟡 Giải thích: Bài thực hành và câu trả lời phỏng vấn? · 📚 #13
  *Ý chính:* Bài tập: thiết kế UpdateMyProfile với input, Actor, hai ports, lỗi và test. Sau đó giả lập Keycloak timeout, MongoDB down và request của user khác. Kể thiết kế dự kiến như thành tích đã làm; chỉ kể tên thư mục mà không mô tả dependency và trade-off.

## Phần B. Tình huống w-identity

- [ ] 🔴 Use case gọi repository lúc chạy có vi phạm Dependency Rule không? · 📚 #1
  *Ý chính:* Không nếu nó phụ thuộc port của lớp trong; adapter bên ngoài implements port. Phân biệt runtime call và source dependency.
- [ ] 🔴 Dùng @Injectable có tự làm code đạt Clean Architecture không? · 📚 #5
  *Ý chính:* Không. DI là cơ chế; cần xem abstraction thuộc lớp nào và framework có rò vào nghiệp vụ không.
- [ ] 🔴 Nếu chuyển TCP sang HTTP thì thay gì? · 📚 #7
  *Ý chính:* Thêm presentation adapter, giữ input/output và policy application; composition root đổi wiring. Kiểm thử lại contract giao tiếp.
- [ ] 🔴 Keycloak tạo user xong nhưng client nhận timeout thì retry thế nào? · 📚 #8
  *Ý chính:* Kết quả chưa xác định. Cần đối soát hoặc idempotency bền vững trước khi lặp tác dụng phụ; không giả định timeout là chưa tạo.
- [ ] 🔴 MongoDB transaction có rollback Keycloak không? · 📚 #9
  *Ý chính:* Không. Khác tài nguyên giao dịch; phải thiết kế lỗi từng phần, compensation hoặc eventual consistency khi cần.
- [ ] 🔴 Fake test đều pass nhưng production lỗi thì thiếu gì? · 📚 #10
  *Ý chính:* Integration/contract test kiểm tra adapter, schema/index, lỗi thực tế và E2E các biên.
- [ ] 🔴 Có nên tạo interface cho mọi class không? · 📚 #12
  *Ý chính:* Không. Tạo ở ranh giới cần đảo phụ thuộc hoặc thay thế, tránh abstraction không có mục đích.
- [ ] 🔴 Hãy mô tả một use case khóa user và điểm lỗi từng phần. · 📚 #3
  *Ý chính:* Kiểm tra admin, tắt account, kết thúc session; bước cuối lỗi phải báo account đã khóa. JWT có thể còn sống đến hết hạn.
- [ ] 🔴 Mongoose document có nên là entity domain không? · 📚 #6
  *Ý chính:* Không trong lựa chọn kiến trúc này; mapper chuyển sang mô hình độc lập để tránh rò persistence.
- [ ] 🔴 Thiết kế UpdateMyProfile trong 5 phút. · 📚 #13
  *Ý chính:* Actor xác định userId; validate input, xác nhận tài khoản qua port, cập nhật profile repository; test quyền và lỗi dependency.
- [ ] 🔴 Clean Architecture có bắt buộc microservices và CQRS không? · 📚 #11
  *Ý chính:* Không; hướng dependency áp dụng cả monolith, CQRS là quyết định riêng.
- [ ] 🔴 Khi nào không nên áp dụng đầy đủ các lớp? · 📚 #12
  *Ý chính:* CRUD đơn giản, vòng đời ngắn hoặc mapping/interface không mang lại lợi ích đủ bù chi phí; vẫn giữ ranh giới cần thiết.
