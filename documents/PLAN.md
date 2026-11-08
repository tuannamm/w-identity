# Kế hoạch triển khai w-identity

## Mục tiêu và phạm vi

Xây dựng dịch vụ NestJS quản lý người dùng và tương tác với Keycloak. Admin quản lý tài khoản; người dùng xem thông tin và cập nhật hồ sơ cá nhân. Dịch vụ giao tiếp bằng TCP qua API Gateway và đăng ký với service discovery.

```text
Client → API Gateway (xác minh JWT) → TCP w-identity → Keycloak / MongoDB
```

Phạm vi v1: một realm, quyền toàn hệ thống `admin` và `user`; Keycloak quản lý danh tính, MongoDB quản lý hồ sơ nghiệp vụ. Không bao gồm đăng nhập, đăng ký, refresh token, phân quyền theo project/workspace, upload ảnh, xóa tài khoản, đồng bộ nền từ Keycloak Admin Console hoặc phát sự kiện RabbitMQ.

## Clean Architecture

Tổ chức các lớp trong app `w-identity` hiện tại, chưa tách Nx libraries. Các bước nghiệp vụ bên dưới được triển khai theo cấu trúc và thứ tự kiến trúc trong phần này.

| Lớp | Trách nhiệm |
|---|---|
| Domain | Mô hình tài khoản, hồ sơ, role và quy tắc nghiệp vụ thuần |
| Application | Use case, kiểm tra quyền và interface kết nối với hệ thống bên ngoài |
| Infrastructure | Adapter Keycloak và repository MongoDB hiện thực các interface |
| Presentation | TCP controller, DTO, mapping và chuyển lỗi sang hợp đồng gateway |
| Bootstrap | Cấu hình NestJS, dependency injection, health và discovery |

Hướng phụ thuộc: `Application → Domain`; `Infrastructure → Application + Domain`; `Presentation → Application`; bootstrap lắp ghép các lớp. Domain và Application dùng TypeScript thuần, không import NestJS, Mongoose, Keycloak SDK hay hợp đồng gateway.

```text
src/
├── domain/
│   ├── models/                 # user-account, user-profile
│   ├── policies/               # application-role
│   └── errors/
├── application/
│   ├── ports/                  # identity-provider, user-profile-repository
│   ├── security/               # actor, authorization policy
│   ├── use-cases/              # users, roles, me
│   └── errors/
├── infrastructure/
│   ├── keycloak/               # HTTP client, token provider, adapter, mapper
│   └── persistence/mongoose/   # schema, repository, mapper
├── presentation/tcp/
│   ├── controllers/
│   ├── dto/
│   ├── contracts/
│   ├── mappers/
│   └── filters/
├── bootstrap/                  # config, DI tokens, identity.module
├── app.module.ts
└── main.ts
```

Chỉ tạo file khi cần, không tạo lớp rỗng. Unit test đặt cạnh code; test tích hợp và E2E đặt trong `test/`.

### Thứ tự xây dựng kiến trúc

1. **Domain:** tạo `UserAccount`, `UserProfile` và policy cho role `admin`, `user`. Trong mô hình dùng `userId`; adapter MongoDB ánh xạ sang `keycloakUserId`. Không đưa decorator NestJS, Mongoose document hay Keycloak response vào domain.
2. **Application ports:** khai báo `IdentityProviderPort` cho thao tác tài khoản, role, session và email; `UserProfileRepositoryPort` cung cấp `getOrCreate(userId)` và `update(userId, patch)`. Ports nhận và trả mô hình nội bộ. Khai báo `Actor` gồm `userId`, `issuer`, `roles` và policy yêu cầu đăng nhập/admin.
3. **Use cases:** tạo riêng `CreateUser`, `ListUsers`, `GetUser`, `UpdateUser`, `SetUserStatus`, `ListRoles`, `AssignUserRole`, `RemoveUserRole`, `GetMe`, `UpdateMyProfile`, `SendPasswordResetEmail`. Mỗi use case có `execute(input, actor)`, nhận ports qua constructor, kiểm tra quyền trước khi gọi adapter và trả lỗi nghiệp vụ có mã ổn định.
4. **Infrastructure:** hiện thực `KeycloakIdentityAdapter` và `MongooseUserProfileRepository`; tách token provider, HTTP client và mapper. Ánh xạ lỗi Keycloak thành lỗi application; schema và document chỉ tồn tại ở lớp persistence. Repository upsert an toàn và có unique index.
5. **Presentation:** TCP controller nhận request, validate DTO, ánh xạ actor/input, gọi use case rồi ánh xạ response. RPC filter chuyển lỗi application thành `GatewayRpcError`; lỗi bất ngờ trả thông báo chung, log request ID và không lộ stack trace hay thông tin kết nối.
6. **Bootstrap:** khai báo DI tokens và factory providers, lắp adapters vào use cases trong `IdentityModule`; giữ `AppModule` cho cấu hình, health và discovery. Chuyển `main.ts` sang TCP, bật shutdown hooks. Hoàn thiện trước một luồng `GET /me`, rồi mở rộng các API còn lại; loại bỏ controller/service mẫu khi có thay thế.

Không dùng CQRS framework, command bus, event bus hoặc generic base repository trong v1. Ưu tiên kiểu dữ liệu và hàm policy; chỉ tạo entity class khi cần đóng gói hành vi. Khi khóa tài khoản thành công nhưng kết thúc session thất bại, trả lỗi thể hiện rõ tài khoản đã bị khóa.

### Kiểm thử kiến trúc

- [ ] Kiểm thử Domain và Application bằng fake ports: quyền, role, quyền sở hữu hồ sơ, trùng dữ liệu, tài khoản không tồn tại và lỗi từng phần; không cần khởi động NestJS hoặc database.
- [ ] Kiểm thử adapter với Keycloak/MongoDB: token cache, ánh xạ lỗi, upsert đồng thời và unique index.
- [ ] Kiểm thử presentation: DTO, actor, message pattern, response và RPC error.
- [ ] Bổ sung kiểm tra import: Domain không phụ thuộc lớp ngoài; Application chỉ phụ thuộc Domain và không import framework.
- [ ] Kiểm thử E2E từ gateway qua TCP đến Keycloak/MongoDB, gồm luồng admin, `/me`, token sai và thiếu quyền.

## Bước 1 — Chuẩn bị môi trường và cấu hình

- [ ] Cấu hình realm, role `admin` và `user`, client cho ứng dụng, audience và service account riêng cho w-identity với quyền tối thiểu cần thiết. Tạo fixture dev có thể chạy lại và hướng dẫn bootstrap admin đầu tiên.
- [ ] Cấu hình Keycloak URL, realm, client credentials, issuer, audience, MongoDB URI và cổng TCP bằng biến môi trường; kiểm tra cấu hình bắt buộc khi khởi động.
- [ ] Bổ sung `.env.example`, hướng dẫn chạy các dịch vụ trong Docker Compose và cấu hình SMTP để gửi email đặt lại mật khẩu.
- [ ] Giữ health và service discovery hiện có; cấu hình graceful shutdown.

**Hoàn thành khi:** môi trường dev khởi động được, cấu hình thiếu hoặc sai được báo rõ và không ghi secret vào log.

## Bước 2 — Xác thực tại API Gateway

- [ ] Bổ sung metadata security vào route từ OpenAPI. Route mặc định yêu cầu bearer token; `security: []` cho phép truy cập công khai; từ chối security scheme chưa hỗ trợ khi nạp spec.
- [ ] Xác minh JWT bằng JWKS của Keycloak, kiểm tra thuật toán cho phép, chữ ký, issuer, audience và thời hạn; hỗ trợ xoay khóa.
- [ ] Dựng `GatewayRequest.user` từ claim đã xác minh: `sub`, `iss` và `roles` từ `realm_access.roles`. Không nhận danh tính hoặc role do client tự khai báo trong body/header.
- [ ] Trả `401` khi token thiếu hoặc không hợp lệ; trả `403` khi thiếu quyền. Chỉ cho phép truy cập cổng TCP của w-identity từ mạng nội bộ tin cậy.

**Hoàn thành khi:** request hợp lệ có danh tính được truyền xuống service; token sai và request giả danh bị từ chối.

## Bước 3 — Chuyển w-identity sang TCP và khai báo hợp đồng

- [ ] Chuyển bootstrap sang NestJS TCP microservice, bật shutdown hooks và dùng cùng cổng với service discovery.
- [ ] Giữ cấu trúc `GatewayRequest` và `GatewayRpcError` theo hợp đồng gateway. Dùng namespace `identity.*` để tránh trùng pattern `user.*` của echo-service.
- [ ] Tạo OpenAPI spec riêng cho identity; mỗi `operationId` khớp chính xác với một message pattern. Gateway chuyển lỗi RPC thành `problem+json`.
- [ ] Dùng DTO allowlist, từ chối trường ngoài hợp đồng; kiểm tra quyền tại từng handler. Các thao tác `/me` luôn lấy ID từ `user.sub`.

| HTTP qua gateway | Message pattern | Quyền |
|---|---|---|
| `GET /users` | `identity.users.list` | Admin |
| `POST /users` | `identity.users.create` | Admin |
| `GET /users/{id}` | `identity.users.get` | Admin |
| `PATCH /users/{id}` | `identity.users.update` | Admin |
| `PATCH /users/{id}/status` | `identity.users.setStatus` | Admin |
| `GET /roles` | `identity.roles.list` | Admin |
| `PUT /users/{id}/roles/{role}` | `identity.users.assignRole` | Admin |
| `DELETE /users/{id}/roles/{role}` | `identity.users.removeRole` | Admin |
| `POST /users/{id}/password-reset-email` | `identity.users.sendPasswordReset` | Admin |
| `GET /me` | `identity.me.get` | Đã đăng nhập |
| `PATCH /me` | `identity.me.updateProfile` | Đã đăng nhập |

**Hoàn thành khi:** gateway tìm thấy các pattern qua registry, định tuyến đúng và trả lỗi theo hợp đồng.

## Bước 4 — Tích hợp Keycloak

- [ ] Tách Keycloak adapter và nghiệp vụ người dùng. Gọi Admin REST API bằng service account, không truy cập trực tiếp database Keycloak.
- [ ] Lấy token bằng client credentials, cache theo hạn dùng và refresh một lần khi gặp `401`; đặt timeout cho request. Không tự động retry tạo tài khoản hoặc gửi email khi kết quả chưa xác định.
- [ ] Quản lý `id`, username, email, họ tên, `enabled`, `emailVerified` và realm roles tại Keycloak. Chỉ cho phép gán/gỡ role ứng dụng `admin`, `user`.
- [ ] Tạo tài khoản bằng username, email và họ tên; mặc định bật và có role `user`, không nhận mật khẩu. Nếu gán role mặc định thất bại, trả lỗi kèm ID tài khoản đã tạo để admin khắc phục, không tự xóa tài khoản.
- [ ] Cho admin sửa email và họ tên; username bất biến trong v1. Khi đổi email, đặt `emailVerified=false`.
- [ ] Liệt kê tài khoản từ Keycloak với `search`, `enabled`, `offset`, `limit`; mặc định `limit=20`, tối đa `100`. Không lọc theo trường MongoDB.
- [ ] Khi khóa tài khoản, tắt tài khoản và yêu cầu kết thúc session. Cấu hình access token mặc định 5 phút; token đã phát hành có thể còn hiệu lực đến khi hết hạn.
- [ ] Gửi email đặt lại mật khẩu qua `execute-actions-email` với `UPDATE_PASSWORD`; SMTP phải được cấu hình.

**Hoàn thành khi:** admin thực hiện được các thao tác tài khoản và role qua gateway; lỗi trùng dữ liệu, Keycloak và SMTP được trả rõ ràng.

## Bước 5 — Hồ sơ MongoDB

- [ ] Dùng `@nestjs/mongoose` lưu hồ sơ gồm `keycloakUserId`, `avatarUrl`, `phoneNumber`, `timezone`, `locale`, `createdAt`, `updatedAt`; tạo unique index cho `keycloakUserId`.
- [ ] Dùng ID Keycloak làm ID công khai; không xuất MongoDB `_id`, lưu mật khẩu, token hoặc bản sao role trong hồ sơ.
- [ ] Upsert hồ sơ khi đọc hoặc cập nhật hồ sơ của tài khoản Keycloak hợp lệ, bao gồm tài khoản đã tồn tại trước đó. Tạo tài khoản hoàn tất ở Keycloak; hồ sơ MongoDB được tạo lười.
- [ ] `GET /me` và chi tiết người dùng kết hợp dữ liệu Keycloak với hồ sơ MongoDB. `PATCH /me` chỉ cập nhật các trường hồ sơ MongoDB; thông tin tài khoản thuộc luồng admin.
- [ ] Tách thao tác ghi: request hồ sơ chỉ ghi MongoDB, request tài khoản chỉ ghi Keycloak.

**Hoàn thành khi:** người dùng xem và sửa hồ sơ của mình; upsert đồng thời không tạo bản ghi trùng và lỗi MongoDB không làm tạo lại tài khoản Keycloak.

## Bước 6 — Kiểm thử, vận hành và bàn giao

- [ ] Kiểm thử xác thực: token hợp lệ, sai chữ ký/issuer/audience, hết hạn, xoay JWKS, route công khai và request giả danh.
- [ ] Kiểm thử phân quyền: user không gọi API admin, không sửa hồ sơ người khác hoặc tự cấp role; thiếu danh tính bị từ chối.
- [ ] Kiểm thử nghiệp vụ: tạo và tìm tài khoản, trùng username/email, cập nhật email, bật/tắt, role ngoài allowlist, validation và email đặt lại mật khẩu.
- [ ] Kiểm thử lỗi Keycloak timeout, service account thiếu quyền, SMTP lỗi, gán role mặc định thất bại, kết thúc session thất bại và MongoDB không khả dụng.
- [ ] Kiểm thử E2E HTTP → gateway → discovery → TCP → Keycloak/MongoDB bằng realm và database riêng; xác minh `/me`, phân trang và cấu trúc lỗi.
- [ ] Log request ID, người thực hiện, thao tác, đối tượng và kết quả; không ghi token, secret hoặc toàn bộ hồ sơ.
- [ ] Chạy build, typecheck, lint và test qua Nx cho các project thay đổi; cập nhật hướng dẫn chạy và request mẫu.

**Hoàn thành khi:** các API trong bảng chạy qua gateway với Keycloak và MongoDB thật, các kiểm tra quyền đạt yêu cầu và tài liệu đủ để dựng môi trường mới.

## Giả định vận hành

- Admin quản lý role toàn hệ thống; v1 chưa bảo vệ admin cuối cùng. Giữ tài khoản quản trị khẩn cấp riêng trong Keycloak.
- Không đồng bộ nền các thay đổi thực hiện trực tiếp trên Keycloak Admin Console; dữ liệu tài khoản được đọc từ Keycloak, hồ sơ MongoDB được quản lý qua w-identity.
- Tham khảo [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/index.html) cho các thao tác quản trị và gửi email.

## Nhật ký triển khai

- Bước 1: đã thêm cấu hình fail-fast, `.env.example` và realm fixture dev. SMTP và admin ban đầu cấu hình theo README. Kiểm thử hạ tầng thực tế được ghi riêng ở bước nghiệm thu.

- Bước 2: gateway xác minh JWT/JWKS, secure-by-default và ánh xạ danh tính đã xác minh. Gateway build đạt; 136 tests đạt trên Node 24 với VM modules.
- Clean Architecture bước 1–3: Domain, ports, Actor/policy và 11 use cases đã có; 7 test nghiệp vụ đạt với fake ports.

- Bước 4: adapter Keycloak, token cache/refresh, mapping dữ liệu và lỗi đã hoàn thành; kiểm thử không retry tác dụng phụ, lỗi 403/404/409/500 và dùng chung token đồng thời đạt. Kiểm thử Keycloak thật nằm ở bước nghiệm thu.

- Bước 5: MongoDB repository đã qua kiểm thử database thật: unique index, 20 upsert đồng thời không trùng, lưu/đọc hồ sơ, không lộ `_id` và lỗi storage được chuẩn hóa.

- Bước 3 / Clean Architecture bước 4–6: TCP controller, DTO/filter, composition root và readiness MongoDB đã tích hợp; toàn luồng JWT thật → gateway → registry thật → TCP → Keycloak/MongoDB đạt.
