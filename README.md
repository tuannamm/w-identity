# w-identity

NestJS TCP service theo Clean Architecture. Kế hoạch và checklist: [documents/PLAN.md](documents/PLAN.md).

## Môi trường dev

1. Từ workspace root, chạy `docker compose up -d mongodb keycloak`.
2. Import `fixtures/pm-realm.json` bằng Keycloak Admin Console (Create realm → Browse). Fixture chỉ dùng dev; import lần đầu, không ghi đè realm đang dùng. Realm `pm` có access token 5 phút, role `admin`/`user`, client PKCE `pm-web` và service account `identity-service`.
3. Trong realm pm, tạo admin đầu tiên bằng Admin Console, đặt mật khẩu tạm thời và gán realm role `admin`. Giữ tài khoản quản trị Keycloak riêng để khôi phục khi mất admin ứng dụng.
4. Trong Realm settings → Email, cấu hình SMTP rồi thử gửi email. Không lưu SMTP password vào Git.
5. Copy `.env.example` thành `.env`, sửa các secret. Gateway dùng `KEYCLOAK_ISSUER=http://localhost:8081/realms/pm`, `KEYCLOAK_AUDIENCE=w-identity`.
6. Chạy qua Nx từ root: `npm exec nx run w-identity:start:dev`. Môi trường có thay đổi TypeScript references chưa sync có thể dùng `--skipSync`.

Fixture có thể import lại vào **realm mới/rỗng** để dựng môi trường tương đương; không tự động reset dữ liệu realm hiện tại. Service account chỉ có `manage-users`, `view-users`, `view-realm`, không có `realm-admin`.

Cổng TCP mặc định chỉ bind `127.0.0.1`; khi triển khai container, đặt `IDENTITY_HOST=0.0.0.0` và cô lập mạng để chỉ gateway được gọi. Health dùng cổng 9002. MongoDB lưu database riêng `w-identity`.

## Kiểm tra

`npm exec nx run w-identity:test -- --runInBand --skipSync`

`npm exec nx run w-identity:build -- --skipSync`

## Dependency và phiên bản Node

Dùng Node 24 (`nvm use 24`); test Jest cần VM modules, đã cấu hình trong script. Cài dependency ở **workspace root** bằng `npm install --legacy-peer-deps`. Root `package-lock.json` là lock chuẩn; app không giữ lock riêng để tránh lệch liên kết `@org/health` và `@org/service-discovery-client`.

## Chạy đủ luồng

- Khởi động Service Registry theo README của `apps/service-discovery`.
- Khởi động w-identity bằng `npm exec nx run w-identity:start:dev -- --skipSync` từ root.
- Trong repo `apps/api-gateway`, copy `.env.identity.example` thành `.env`, rồi chạy `npm exec nx run api-gateway:build` và `npm run start:prod` (cổng HTTP 3000).
- Client đăng nhập với Keycloak qua Authorization Code + PKCE bằng client `pm-web`. API này không cung cấp endpoint nhận username/password để đăng nhập.

Ví dụ từ terminal sau khi có access token của người dùng/admin:

```bash
curl http://localhost:3000/me -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X PATCH http://localhost:3000/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"locale":"vi","timezone":"Asia/Ho_Chi_Minh"}'
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"username":"alice","email":"alice@example.com","firstName":"Alice"}'
```

Spec đầy đủ: `apps/api-gateway/specs/identity/openapi.yml`. API mutation tài khoản trả 204, tạo tài khoản trả 201; cập nhật `/me` trả hồ sơ MongoDB. Danh sách trả `{ items, offset, limit }`, chưa trả tổng số bản ghi.

## Kiểm thử tích hợp và E2E

Các bài test tạo realm/database có tiền tố riêng, tự dọn sau khi chạy và không sửa realm `pm`. SMTP test chỉ nhận thư cục bộ; không gửi ra ngoài.

Chuẩn bị:

1. Chạy MongoDB và Keycloak bằng Docker Compose.
2. Build gateway trong repo của nó: `npm exec nx run api-gateway:build`.
3. Build registry bằng script hiện có: `npm --prefix apps/service-discovery run build` từ root. Registry là repo riêng và chưa có Nx target trong workspace root.
4. Từ root chạy `npm exec nx run w-identity:test:e2e -- --skipSync`. Target tự build w-identity và các thư viện của nó trước khi test. Có thể chỉ kiểm tra MongoDB bằng `npm exec nx run w-identity:test:mongo -- --skipSync`.

Biến môi trường tùy chỉnh cho test: `IDENTITY_TEST_KEYCLOAK_URL`, `IDENTITY_TEST_ADMIN`, `IDENTITY_TEST_ADMIN_PASSWORD`, `IDENTITY_TEST_MONGO_URI`. SMTP host mặc định `host.docker.internal` để Keycloak trong Docker kết nối SMTP test trên máy host; nếu Keycloak chạy trực tiếp trên host, đặt `IDENTITY_TEST_SMTP_HOST=127.0.0.1`.

Health tại `http://localhost:9002/health/live` và `/health/ready`. MongoDB mất kết nối làm readiness trả 503; liveness chỉ kiểm tra nội tại process.

## Ranh giới và xử lý lỗi từng phần

- Core TypeScript thuần ở `domain/` và `application/`. Adapter và composition root nằm ở `infrastructure/` và `bootstrap/`; TCP DTO/filter nằm ở `presentation/`.
- `ACCOUNT_CREATED_ROLE_FAILED`: tài khoản đã được tạo, dùng `details.userId` để gán role lại; không gửi lại yêu cầu tạo một cách mù quáng.
- `ACCOUNT_DISABLED_SESSION_FAILED`: tài khoản đã bị khóa, cần thử kết thúc session lại qua công cụ quản trị Keycloak.
- `OPERATION_UNCERTAIN`: lỗi kết nối có thể xảy ra sau khi Keycloak đã xử lý; đối soát trước khi retry. Service không tự động retry tạo tài khoản hoặc gửi email.
- Gateway xác minh JWT độc lập. Thay đổi role hoặc khóa tài khoản không thu hồi ngay JWT đã phát hành ở gateway; TTL fixture là 5 phút. `/me` kiểm tra trạng thái tài khoản trực tiếp với Keycloak.
- Quản trị tài khoản khẩn cấp và bảo vệ admin cuối cùng vẫn do vận hành Keycloak quản lý; v1 chỉ thao tác role ứng dụng `admin`/`user`.
