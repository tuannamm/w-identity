# Câu hỏi phỏng vấn DDD

Che đáp án, nói thành tiếng 60–90 giây: định nghĩa → đánh đổi → ví dụ nhà hàng. Chỉ đánh dấu đã thuộc khi giải thích được câu hỏi phụ.

## Phần A. Strategic Design

### Nền tảng

- [ ] 🟢 DDD là gì? Khác gì với một design pattern hay cách chia folder? · 📚 #0
  *Ý chính:* DDD là cách tiếp cận phát triển và thiết kế lấy nghiệp vụ làm trung tâm: khám phá mô hình, ngôn ngữ, ranh giới cùng chuyên gia nghiệp vụ rồi thể hiện trong code. **Bẫy cần tránh:** nói DDD là chia thư mục domain/application/infrastructure.
- [ ] 🟡 Strategic Design và Tactical Design khác nhau thế nào? · 📚 #0
  *Ý chính:* Strategic tìm ngôn ngữ chung, bounded context, subdomain và quan hệ giữa context. Tactical hiện thực mô hình bằng entity, value object, aggregate, policy hoặc event khi có nhu cầu thực tế. Strategic đi trước.
- [ ] 🟢 Ubiquitous Language là gì? Cho ví dụ ở nhà hàng. · 📚 #1
  *Ý chính:* Thuật ngữ chung giữa developer và chuyên gia nghiệp vụ, cùng nghĩa trong một context và có mặt trong tài liệu lẫn code. Ví dụ "xác nhận đơn" dùng cả khi nói chuyện và tên method, không phải `updateStatus(2)`.
- [ ] 🟡 Dùng ví dụ nhà hàng để giải thích bounded context. Có bắt buộc mỗi context là một microservice không? · 📚 #3
  *Ý chính:* Món trong Menu, Ordering, Kitchen và Billing có ý nghĩa khác nhau. Context là ranh giới mô hình; lựa chọn triển khai service là quyết định riêng. Giá lúc đặt có thể phải được giữ độc lập giá thực đơn hiện tại.
- [ ] 🟡 Subdomain core, supporting và generic khác nhau thế nào? Identity thuộc loại nào? · 📚 #2
  *Ý chính:* Core tạo lợi thế cạnh tranh, đáng đầu tư mô hình sâu; supporting cần thiết nhưng đơn giản; generic là bài toán chung nên dùng giải pháp có sẵn. Identity thường là generic (Keycloak lo phần lớn), nên không cần DDD tactical đầy đủ.
- [ ] 🟡 Subdomain khác bounded context ở đâu? · 📚 #2
  *Ý chính:* Subdomain thuộc không gian bài toán (nghiệp vụ gồm những phần nào); bounded context thuộc không gian giải pháp (mô hình và ranh giới ta chọn). Lý tưởng là khớp nhau nhưng không bắt buộc một-một.
- [ ] 🟡 Khi nào dùng Anticorruption Layer? Kể thêm hai kiểu quan hệ giữa các context. · 📚 #2
  *Ý chính:* Khi context của mình phải tích hợp với mô hình ngoài (legacy, bên thứ ba) mà không muốn mô hình đó lan vào. Kiểu khác: Shared Kernel, Customer–Supplier, Conformist, Open Host Service, Separate Ways.
- [ ] 🔴 Ordering và Kitchen quan hệ thế nào trong context map? Billing tích hợp cổng thanh toán bên ngoài thì làm gì? · 📚 #3
  *Ý chính:* Ordering là upstream, Kitchen là downstream nhận sự kiện đơn đã xác nhận và dịch thành ticket của mình (Customer–Supplier hoặc qua Published Language). Billing đặt ACL để mô hình của cổng thanh toán không nhiễm vào mô hình hóa đơn.

## Phần B. Tactical Design

- [ ] 🟡 Aggregate có phải một table/collection không? · 📚 #4
  *Ý chính:* Aggregate là ranh giới nhất quán, root kiểm soát thay đổi để giữ bất biến. Order có thể kiểm soát OrderLine và tổng tiền; cấu trúc lưu trữ được chọn sau khi hiểu mô hình.
- [ ] 🟡 Vì sao aggregate tham chiếu aggregate khác bằng ID và mỗi transaction thường chỉ sửa một aggregate? · 📚 #4
  *Ý chính:* Giữ aggregate nhỏ, tránh tranh chấp khóa và tải dữ liệu thừa, giữ ranh giới nhất quán rõ. Nhất quán giữa các aggregate là eventual consistency, thường qua domain event.
- [ ] 🟢 Entity khác Value Object thế nào? Money là loại nào? · 📚 #4
  *Ý chính:* Entity có danh tính và vòng đời (Order có orderId); Value Object xác định bằng giá trị, bất biến, tự bảo vệ tính hợp lệ (Money gồm amount và currency). Hai Money(50, VND) bằng nhau; hai Order cùng nội dung nhưng khác orderId là hai đơn.
- [ ] 🟡 Repository trong DDD khác repository kiểu "một class cho mỗi bảng" thế nào? · 📚 #5
  *Ý chính:* Repository DDD giống một tập hợp các aggregate root: lấy và lưu cả aggregate, thường mỗi aggregate một repository, ngôn ngữ nghiệp vụ. **Bẫy cần tránh:** repository cho từng bảng làm lộ cấu trúc lưu trữ.
- [ ] 🟡 Domain Event khác Integration Event thế nào? Domain Service khác Application Service? · 📚 #5
  *Ý chính:* Domain Event xảy ra trong một bounded context; Integration Event là hợp đồng công bố sang context khác, cần ổn định phiên bản và thường dùng outbox. Domain Service chứa quy tắc nghiệp vụ không thuộc riêng entity nào; Application Service điều phối, không chứa quy tắc nghiệp vụ.
- [ ] 🟡 Anemic Domain Model là gì? Dùng hàm policy thuần thì có bị coi là anemic không? · 📚 #6
  *Ý chính:* Anemic là entity chỉ có dữ liệu, mọi quy tắc nằm ở service nên model không tự bảo vệ bất biến. Hàm policy thuần là lựa chọn có chủ đích khi quy tắc ít, miễn là bất biến vẫn nằm ở Domain và được dùng mọi nơi, không rải trong service/controller.

## Phần C. Áp dụng và đánh đổi

- [ ] 🟡 Event Storming là gì và giúp ích thế nào? · 📚 #6
  *Ý chính:* Workshop dùng giấy dán cùng chuyên gia nghiệp vụ để liệt kê domain event, command, aggregate, từ đó tìm ranh giới context. Dùng trước khi viết code để khám phá domain.
- [ ] 🔴 Khi nào không nên áp dụng DDD đầy đủ? · 📚 #6
  *Ý chính:* CRUD đơn giản, subdomain generic hoặc supporting, đội nhỏ, nghiệp vụ đã có sản phẩm giải quyết. Vẫn nên làm rõ ngôn ngữ và ranh giới ở mức nhẹ. Không thêm aggregate/value object chỉ để đủ tên pattern.
- [ ] 🔴 w-identity có áp dụng DDD không? Bạn nói thế nào trong phỏng vấn? · 📚 #7
  *Ý chính:* Chỉ ở mức nhẹ: tách Domain khỏi hạ tầng, đặt tên theo ngôn ngữ nghiệp vụ, tách UserAccount và User. Không có aggregate, value object, domain event hay context map. Identity là subdomain generic nên không cần DDD đầy đủ; ví dụ nhà hàng dùng để học khái niệm, không gán cho code w-identity.
- [ ] 🔴 Nêu một quy tắc thật cần aggregate và một trường hợp chỉ cần policy thuần. · 📚 #7
  *Ý chính:* Cần aggregate: tổng tiền của Order phải luôn bằng tổng các OrderLine và không có đơn rỗng, nên root kiểm soát mọi thay đổi. Chỉ cần policy thuần: kiểm tra locale/timezone của profile, hàm không cần trạng thái.
