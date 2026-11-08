# Clean Architecture

Bảo vệ nghiệp vụ khỏi chi tiết công nghệ.

Ví dụ: thiết kế dự kiến w-identity.

Note: Nêu rõ đây là thiết kế, chưa phải thành tích triển khai.

---

## Hướng phụ thuộc

Application → Domain

Infrastructure → Application + Domain

Presentation → Application

Note: Phân biệt import trong mã nguồn với chiều gọi hàm khi chạy.

---

## Ports và adapters

Use case cần IdentityProviderPort và UserProfileRepositoryPort.

Keycloak và Mongoose hiện thực các ports.

Note: Interface thuộc bên cần nó; không trả object SDK qua port.

---

## Luồng cập nhật hồ sơ

TCP request → DTO → Actor/input → UpdateMyProfile → ports → adapters → output → response

Note: Quyền kiểm tra trong use case; ID lấy từ actor.

---

## Lỗi và kiểm thử

Không có transaction chung Keycloak/MongoDB.

Fake test nghiệp vụ + integration adapter + E2E.

Note: Timeout có thể xảy ra sau khi thao tác đã thành công.

---

## Đánh đổi

Thêm interface và mapper để có ranh giới dễ kiểm thử.

Chọn mức tách vừa đủ; chưa cần CQRS hoặc nhiều Nx libraries.

Note: Kết thúc bằng một ví dụ và một hạn chế cụ thể.
