# w-identity

NestJS service theo Clean Architecture, nhận request qua TCP và RabbitMQ. Kế hoạch và checklist: [documents/PLAN.md](documents/PLAN.md).

## Đọc code để ôn phỏng vấn

Đọc [KNOWLEDGE.md](documents/KNOWLEDGE.md#13-bài-thực-hành-và-câu-trả-lời-phỏng-vấn) để lần theo luồng `UpdateMyProfile`, phân biệt chiều import với chiều gọi hàm, rồi luyện [câu hỏi tình huống](documents/INTERVIEW-QUESTIONS.md). Bản học tương tác là [Knowledge Base](../../knowledge-base/index.html#clean-architecture); sinh lại từ Markdown bằng `npm exec nx -- run w-identity:docs:knowledge` tại workspace root.

Application sở hữu hai hợp đồng: `IdentityProviderPort` và `UserRepositoryPort`. `KeycloakIdentityAdapter` và `UserRepository` hiện thực các hợp đồng đó; use case nhận port qua constructor. `AppModule` là composition root, dùng `USER_PROFILE_REPOSITORY` với `useExisting: UserRepository` để truyền đúng instance repository do `DatabaseModule` quản lý. Domain, Application và unit test của chúng không import framework hoặc Infrastructure, kể cả `import type`; `test/architecture.spec.ts` kiểm tra ranh giới này.

## Môi trường dev

1. Từ workspace root, chạy `docker compose up -d mongodb keycloak rabbitmq`.
2. Import `fixtures/pm-realm.json` bằng Keycloak Admin Console (Create realm → Browse). Fixture chỉ dùng dev; import lần đầu, không ghi đè realm đang dùng. Realm `pm` có access token 5 phút, client PKCE `pm-web` và service account `identity-service`.
3. Tạo tài khoản thử nghiệm trong Keycloak Admin Console.
4. Trong Realm settings → Email, cấu hình SMTP rồi thử gửi email. Không lưu SMTP password vào Git.
5. Copy `.env.example` thành `.env`, sửa các secret. Gateway dùng `KEYCLOAK_ISSUER=http://localhost:8081/realms/pm`, `KEYCLOAK_AUDIENCE=w-identity`.
6. Chạy qua Nx từ root: `npm exec nx run w-identity:start:dev`. Môi trường có thay đổi TypeScript references chưa sync có thể dùng `--skipSync`.

Fixture có thể import lại vào **realm mới/rỗng** để dựng môi trường tương đương; không tự động reset dữ liệu realm hiện tại. Service account chỉ có `manage-users`, `view-users`, `view-realm`, không có `realm-admin`.

`AppModule` dùng `ConfigModule.forRoot()` để nạp `.env` từ working directory của process (Nx chạy script trong `apps/w-identity`). Biến môi trường của process được ưu tiên hơn file `.env`. Bootstrap TCP đọc `IDENTITY_HOST` (mặc định `127.0.0.1`) và `PORT` (mặc định `4002`, chuyển sang số) trực tiếp từ `ConfigService`. `AuthorizationPolicy` nhận `KEYCLOAK_ISSUER` từ `ConfigService` để kiểm tra actor. Ứng dụng không dùng validation riêng cho các biến này.

`AppModule` import `KeycloakModule` từ [@lib-infrastructure/keycloak](../lib-infrastructure/libs/keycloak/README.md). Thư viện đọc `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_TIMEOUT_MS`; kết nối được kiểm tra cấu hình lúc bootstrap và chỉ lấy token khi có request đầu tiên. `KeycloakIdentityAdapter` giữ logic tài khoản và ánh xạ `KeycloakError` sang contract lỗi ứng dụng hiện có.

Cổng TCP mặc định chỉ bind `127.0.0.1`; khi triển khai container, đặt `IDENTITY_HOST=0.0.0.0` và cô lập mạng để chỉ gateway được gọi. Health dùng cổng 9002. MongoDB lưu database riêng `w-identity`.

## Kiểm tra

RabbitMQ được cấu hình bằng `RABBITMQ_URI` và `RABBITMQ_QUEUE` theo `.env.example`. File `.env` đã tồn tại cũng cần thêm hai biến này. Startup thất bại nếu broker không sẵn sàng trong 10 giây. Các replica dùng chung queue `w-identity`.

Service chạy TCP và RMQ trong cùng application context, không mở HTTP listener. Các `@MessagePattern('identity.…')` hiện có nhận cùng payload và trả cùng lỗi trên hai transport. Có thể thêm `@EventPattern` khi có nghiệp vụ nhận event cụ thể; lần tích hợp này không thêm event nghiệp vụ.

Readiness kiểm tra cả MongoDB và consumer RabbitMQ; liveness giữ kiểm tra nội tại. Queue lỗi là `w-identity.dlq`. Chỉ cho service tin cậy truy cập RabbitMQ, tương tự TCP; payload actor vẫn theo contract hiện có.

Xem [README của lib](../lib-infrastructure/libs/rabbitmq/README.md) về API gửi event/RPC, ack, timeout và DLQ.

Tất cả nhóm test dùng Jest. Unit/architecture test dùng `.spec.ts`; integration/E2E dùng `.spec.mjs` để giữ fixture ESM và kiểm tra bản build thực tế. Lệnh mặc định chỉ chạy unit/architecture, không cần Docker.

```bash
npm exec nx -- run w-identity:test --runInBand
npm exec nx -- run w-identity:test:watch
npm exec nx -- run w-identity:test:cov
npm exec nx -- run w-identity:test:mongo
npm exec nx -- run w-identity:test:profile
npm exec nx -- run w-identity:test:e2e
```

Coverage nằm ở `apps/w-identity/coverage`. Integration chạy tuần tự, dùng database/realm riêng và timeout rõ ràng; lỗi fixture hoặc cleanup làm Jest báo thất bại. `test:profile` cần MongoDB; `test:e2e` cần thêm Keycloak, RabbitMQ, gateway và registry đã build. Các target này tự build service trước khi chạy.

`npm exec nx run w-identity:build -- --skipSync`

## Dependency và phiên bản Node

Dùng Node 24 (`nvm use 24`); test Jest cần VM modules, đã cấu hình trong script. Cài dependency ở **workspace root** bằng `npm install --legacy-peer-deps`. Root `package-lock.json` là lock chuẩn; app không giữ lock riêng để tránh lệch liên kết `@lib-infrastructure/core`.

## Chạy đủ luồng

- Khởi động Service Registry theo README của `apps/service-discovery`.
- Khởi động w-identity bằng `npm exec nx run w-identity:start:dev -- --skipSync` từ root.
- Trong repo `apps/api-gateway`, copy `.env.identity.example` thành `.env`, rồi chạy `npm exec nx run api-gateway:build` và `npm run start:prod` (cổng HTTP 3000).
- Client đăng nhập với Keycloak qua Authorization Code + PKCE bằng client `pm-web`. API này không cung cấp endpoint nhận username/password để đăng nhập.

Ví dụ từ terminal sau khi có access token của người dùng:

```bash
curl http://localhost:3000/me -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X PATCH http://localhost:3000/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"locale":"vi","timezone":"Asia/Ho_Chi_Minh"}'
```

Spec đầy đủ: `apps/api-gateway/specs/identity/openapi.yml`. API mutation tài khoản trả 204, tạo tài khoản trả 201; cập nhật `/me` trả hồ sơ MongoDB. Danh sách trả `{ items, offset, limit }`, chưa trả tổng số bản ghi.

## Kiểm thử tích hợp và E2E

Bộ E2E cũ chưa tương thích với việc tạm khóa quản lý tài khoản và cần cập nhật sau khi có cơ chế phân quyền mới.

Các bài test tạo realm/database có tiền tố riêng, tự dọn sau khi chạy và không sửa realm `pm`. SMTP test chỉ nhận thư cục bộ; không gửi ra ngoài.

Chuẩn bị:

1. Chạy MongoDB, Keycloak và RabbitMQ bằng Docker Compose.
2. Build gateway trong repo của nó: `npm exec nx run api-gateway:build`.
3. Build registry bằng script hiện có: `npm --prefix apps/service-discovery run build` từ root. Registry là repo riêng và chưa có Nx target trong workspace root.
4. Từ root chạy `npm exec nx run w-identity:test:e2e -- --skipSync`. Target tự build w-identity và các thư viện của nó trước khi test. Có thể chỉ kiểm tra MongoDB bằng `npm exec nx run w-identity:test:mongo -- --skipSync`.

Biến môi trường tùy chỉnh cho test: `IDENTITY_TEST_KEYCLOAK_URL`, `IDENTITY_TEST_ADMIN`, `IDENTITY_TEST_ADMIN_PASSWORD`, `IDENTITY_TEST_MONGO_URI`. SMTP host mặc định `host.docker.internal` để Keycloak trong Docker kết nối SMTP test trên máy host; nếu Keycloak chạy trực tiếp trên host, đặt `IDENTITY_TEST_SMTP_HOST=127.0.0.1`.

Health tại `http://localhost:9002/health/live` và `/health/ready`. MongoDB mất kết nối làm readiness trả 503; liveness chỉ kiểm tra nội tại process.

E2E dùng queue RabbitMQ có UUID riêng. Đặt `IDENTITY_TEST_RABBITMQ_URI` để đổi broker test (mặc định `amqp://guest:guest@localhost:5672`).

## Ranh giới và xử lý lỗi từng phần

- Core TypeScript thuần ở `domain/` và `application/`. Adapter nằm ở `infrastructure/`; composition root là `app.module.ts`, DI tokens ở `bootstrap/` và khởi động transport ở `main.ts`. TCP DTO/filter nằm ở `presentation/`.
- `ACCOUNT_DISABLED_SESSION_FAILED`: tài khoản đã bị khóa, cần thử kết thúc session lại qua công cụ quản trị Keycloak.
- `OPERATION_UNCERTAIN`: lỗi kết nối có thể xảy ra sau khi Keycloak đã xử lý; đối soát trước khi retry. Service không tự động retry tạo tài khoản hoặc gửi email.
- Gateway xác minh JWT độc lập. Khóa tài khoản không thu hồi ngay JWT đã phát hành ở gateway; TTL fixture là 5 phút. `/me` kiểm tra trạng thái tài khoản trực tiếp với Keycloak.
- Các thao tác quản lý tài khoản tạm trả `FORBIDDEN` cho đến khi có cơ chế phân quyền mới. Hồ sơ cá nhân vẫn hoạt động.
