# Đợt 1: sửa nền tảng xác thực, phân quyền và phiên làm bài

Ngày hoàn tất: 18/09/2026. Tiếp nối [báo cáo kiến trúc](ARCHITECTURE_AUDIT_2026-09-18.md).

Đợt này tập trung vào lỗi có thể ảnh hưởng trực tiếp việc dùng lớp học. Giữ Next.js, PostgreSQL, Phaser, Pyodide và các game hiện có. Content Manager/CMS vẫn là công cụ local theo yêu cầu; không thay đổi `.gitignore`, di chuyển công cụ này hay bỏ các chức năng biên soạn.

## Đã sửa

| Luồng | Thay đổi |
| --- | --- |
| Đăng nhập và xác thực API | Dùng chung JWT HS256; bỏ cách đọc cookie JSON cũ ở progress, submissions và tải mẫu tài khoản. Kiểm tra trạng thái và vai trò hiện tại từ DB, nên tài khoản đã khóa không tiếp tục gọi API bằng token cũ. |
| Hồ sơ tài khoản | Giữ đúng `status`, `createdBy`, điện thoại và các trường hồ sơ khi đọc DB. Chuẩn hóa `banned` cũ thành `suspended` khi trả dữ liệu; bộ lọc và thống kê vẫn nhận cả hai giá trị. Không sửa hàng dữ liệu cũ. |
| Quản lý tài khoản | Tạo đơn lẻ/hàng loạt lưu người tạo; danh sách giáo viên lọc đúng học sinh của mình. GET/PUT/PATCH/DELETE dùng chung quy tắc quản lý; giáo viên không thể khóa tài khoản ngoài phạm vi hoặc tài khoản quản trị. Chặn tự khóa tài khoản đang sử dụng. |
| Quản lý lớp và nội dung | Kiểm tra chủ lớp ở các API mở/khóa, hiện/ẩn khóa học và tạo cuộc thi/phiên theo lớp. Admin vẫn quản lý được các lớp tồn tại. |
| Mở khóa hàng loạt | Sửa lệch số tham số SQL. Mở một mục và nhiều mục đi cùng một service; cấp quyền khóa học và mở nội dung trong một transaction, có rollback khi lỗi. |
| Nộp bài theo phiên | Tách service riêng; xác thực dữ liệu đầu vào, thành viên lớp, trạng thái và hạn nộp. Khóa hàng phiên trước khi kiểm tra trùng; ghi bài và cập nhật thống kê trong cùng transaction. Hai yêu cầu đồng thời từ cùng học sinh chỉ nhận một bài. |
| Thời hạn phiên | Danh sách phiên đang mở và API nộp dùng chung điều kiện SQL theo đồng hồ DB. Phiên `auto_close = false` nhận bài đến khi giáo viên đóng; giao diện cũng cho tham gia khi đồng hồ về 0. |
| Trang làm bài | Giữ đúng `sessionId` qua đăng nhập; phiên không tồn tại/hết hạn không tự chuyển sang phiên khác. Lấy đường dẫn game từ phiên được chọn. Bỏ phản hồi tải cũ khi đổi ngữ cảnh; không hiển thị metadata của bài trước trong lúc tải bài mới. |
| Bộ nhớ đăng nhập | Xóa cả localStorage và cookie hồ sơ khi server từ chối phiên. Kiểm tra phiên thật trước khi tự chuyển khỏi trang đăng nhập. Phản hồi kiểm tra chậm không ghi đè lần đăng nhập/đăng xuất mới hơn. |

Quy tắc hiện tại vẫn là **mỗi học sinh một bài nộp cuối cho một phiên**. Đợt này không kích hoạt trường `max_submissions` đang có sẵn trong schema. Điểm có trọng số của coding set được giữ nguyên.

## Kiểm chứng

- `pnpm.cmd test:foundation`: **49/49 đạt**. Dùng mã TypeScript/service/API thật, thay DB và I/O bằng dữ liệu giả. Có kiểm tra lỗi quyền, token cũ, trạng thái khóa, tạo tài khoản, rollback và yêu cầu nộp đồng thời. Đây chưa phải kiểm thử tích hợp PostgreSQL thật.
- `pnpm.cmd exec tsc --noEmit`: đạt.
- `pnpm.cmd build`: đạt; cần mạng để tải các Google Fonts sẵn có của dự án. Còn cảnh báo Next.js chọn workspace root theo lockfile ở thư mục cha.
- ESLint trên các file sửa/mới: phần nền tảng và test không có lỗi mới. Các lỗi cũ trong trang tài khoản giáo viên (12 lỗi, 3 cảnh báo) và một cảnh báo dependency hook cũ ở trang danh sách phiên chưa được dọn trong đợt này. Lint toàn dự án chưa sạch.
- Playwright trên localhost với **toàn bộ API được mock**: hồ sơ lưu cũ + auth 401 vẫn ở trang đăng nhập; đăng nhập giữ phiên 999 và hiện lỗi thay vì vào phiên 41; phiên 41 tải đúng game dù URL có `path` sai; Pyodide thật chạy bài mẫu và UI gửi đúng `/api/student/sessions/41/submit`, chuyển nút sang “Đã nộp bài”; phiên đóng thủ công còn nút “Tham gia ngay” khi thời gian còn lại bằng 0.
- `git diff --check`: đạt.

Không chạy migration, sửa dữ liệu thật, tạo tài khoản thật hay triển khai lên website đang dùng.

## Lưu ý khi dùng bản sửa

1. **Tài khoản cũ thiếu `created_by`:** trước đây mapper/bộ lọc bỏ qua trường này. Sau sửa, giáo viên chỉ thấy tài khoản do mình tạo. Tài khoản cũ có người tạo trống vẫn do admin quản lý; cần kiểm kê và gán đúng giáo viên trước khi bàn giao nếu muốn giáo viên quản lý chúng. Không tự suy luận từ thành viên lớp vì một học sinh có thể học nhiều lớp.
2. **Khóa tài khoản có hiệu lực thật:** `inactive`, `suspended` và `banned` đều bị từ chối đăng nhập/API. Nếu trước đây vẫn đăng nhập được do lỗi mapper, cần admin kích hoạt lại tài khoản muốn dùng.
3. **JWT production:** cần `JWT_SECRET` riêng; production từ chối secret thiếu hoặc các giá trị mẫu đã biết. Cấu hình local hiện đã có giá trị ngoài các mẫu này; chưa kiểm tra cấu hình host. Không đổi secret trong đợt này.
4. **Schema:** mã dựa trên các cột đã có trong `database/supabase/schema.sql`, không cần migration mới theo schema đó. Chưa đối chiếu schema DB đang chạy.
5. **Công cụ local:** build tại máy này vẫn bao gồm các trang Content Manager/CMS đang tồn tại trên đĩa dù chúng bị Git bỏ qua. Chính sách local hiện tại được giữ nguyên.

## Việc nên làm tiếp

1. Kiểm kê dữ liệu/schema trên môi trường thử nghiệm; xử lý tài khoản thiếu người tạo, rồi kiểm thử transaction bằng PostgreSQL thật và hai tài khoản giáo viên/học sinh mẫu.
2. Chuẩn hóa quyền khóa học: làm rõ “được gán”, “hiển thị”, “nội dung được mở”; hợp nhất cách khóa một mục/hàng loạt và thu hồi quyền. Đợt này mới hợp nhất đường **mở khóa**.
3. Thống nhất hợp đồng kết quả game/coding set: mã được chấm phải trùng mã được nộp; chặn nộp khi game đang chấm; tách kết quả luyện tập trên trình duyệt khỏi điểm được server xác nhận. Kiểm tra đầu vào hiện tại không chống giả điểm từ client.
4. Phân định `sessions`, `lesson_sessions`, assignments và hai hệ thống contest trước khi hợp nhất. Các API legacy progress/submissions mới được sửa xác thực, chưa thiết kế lại toàn bộ nghiệp vụ nộp/chấm.
5. Chuẩn hóa định dạng nội dung và phiên bản game để bài nộp cũ không bị đổi ý nghĩa khi admin sửa đề. Sau đó mới giảm phần game engine đang bị sao chép và cải tiến quy trình biên soạn local.
6. Dọn lớp DB tương thích MySQL và script cũ theo từng nhóm có kiểm chứng; dọn lint dần theo module, tránh thay đổi hàng loạt chỉ để hết cảnh báo.

## Các điểm vào để tiếp tục sửa

- JWT và quyền: `src/lib/authToken.ts`, `src/lib/apiAuth.ts`, `src/lib/classAccess.ts`.
- Tài khoản: `src/lib/services/users.ts`, `src/lib/auth.ts`.
- Phiên và bài nộp: `src/lib/sessionPolicy.ts`, `src/lib/services/sessionSubmissions.ts`, `src/lib/services/sessions.ts`.
- Chọn phiên trong UI: `src/lib/playSession.ts`, `src/app/play/page.tsx`.
- Mở khóa: `src/lib/services/courseAccess.ts`.
- Kiểm tra hồi quy: `tests/foundation/`, chạy bằng script `test:foundation` trong `package.json`.
