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
