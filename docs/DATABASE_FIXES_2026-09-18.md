# Đợt 2: chuẩn hóa cơ sở dữ liệu Supabase và công cụ migration

Ngày hoàn tất: 18/09/2026. Tiếp nối [đợt nền tảng](FOUNDATION_FIXES_2026-09-18.md) và
[báo cáo kiến trúc](ARCHITECTURE_AUDIT_2026-09-18.md).

Đợt nền tảng dừng lại ở chỗ chưa từng kết nối vào Supabase thật, nên mọi kết luận về schema đều là
suy đoán từ file SQL trong repo. Đợt này kết nối thật, kiểm kê, rồi sửa đúng những chỗ code và DB
lệch nhau. Phạm vi cố ý hẹp: chỉ ba migration, đều mang tính bổ sung, không xóa dữ liệu, không reset
tài khoản dù người dùng đã cho phép reset.

## Ba lệch pha đã tìm ra và sửa

| Vấn đề | Bằng chứng | Cách sửa |
| --- | --- | --- |
| Bảng `courses` thiếu cột `order_num` | Code sắp xếp khóa học theo cột này. Trước đây một khối `try/catch` nuốt lỗi rồi sắp xếp lại theo `created_at`, nên lỗi không bao giờ lộ ra, còn thao tác đổi thứ tự thì hỏng âm thầm. | `001_course_order.sql` thêm cột, điền thứ tự theo `created_at` cho hàng cũ, đặt NOT NULL default 0 và tạo index. Bỏ luôn khối `catch` che lỗi trong [courses.ts](../src/lib/services/courses.ts). |
| Hai loại phiên dùng chung một bảng bài nộp | `LessonSessionService` tạo hàng trong `lesson_sessions` nhưng đọc ghi `session_submissions`, mà khóa ngoại của bảng đó trỏ sang `sessions`. Hai bảng phiên đánh số ID độc lập, nên một bài nộp có thể gắn nhầm vào phiên của lớp khác chỉ vì trùng số. | `002_session_submission_ownership.sql` tạo bảng riêng `lesson_session_submissions` với khóa ngoại đúng, và thêm UNIQUE(session_id, user_id) cho bảng bài nộp của lớp. |
| Hai view bỏ qua RLS | `v_class_stats` và `v_assignment_leaderboard` được cấp SELECT cho vai trò `anon`. View chạy bằng quyền chủ sở hữu nên đọc xuyên qua RLS của bảng gốc, lộ danh sách lớp và bảng xếp hạng qua Data API công khai. | `003_view_security.sql` bật `security_invoker = true` để view chạy bằng quyền người gọi. |

Nhân tiện migration 002, `submitToSession` chuyển từ SELECT rồi UPDATE/INSERT sang một câu upsert
nguyên tử giữ điểm cao nhất. Trước đó hai lần nộp đồng thời có thể để bài điểm thấp ghi đè bài điểm
cao. [sessionSubmissions.ts](../src/lib/services/sessionSubmissions.ts) ánh xạ lỗi PostgreSQL 23505
của ràng buộc mới thành HTTP 409, nên khi ràng buộc bắt được một lần nộp trùng do đua, học sinh thấy
đúng thông báo đã nộp bài chứ không phải lỗi máy chủ.

## Công cụ mới trong database/supabase/tools

Trước đợt này dự án không có cơ chế migration, chỉ có một script đổ nguyên dump. Nay có runner với
sổ lịch sử riêng. Chi tiết vận hành nằm trong [README](../database/supabase/README.md).

- **Sổ migration** ở schema riêng `pylearn_migrations`, đã thu hồi quyền của `PUBLIC`. Runner chặn
  file đã apply mà bị sửa, file biến mất, và migration chen số lùi.
- **Dấu vân tay đích.** Mọi lệnh ghi bắt buộc truyền `--target` khớp mã băm của host, cổng, database
  và user. Mã này không chứa mật khẩu nên ghi vào tài liệu được, và nó khiến việc chạy nhầm lên
  project khác thành không thể.
- **Cả đợt trong một transaction** kèm advisory lock và `lock_timeout` 5 giây. Một file lỗi thì cả
  đợt lùi, sổ lịch sử cũng lùi theo.
- **`db:check`** chạy y hệt lần apply thật rồi ROLLBACK, cộng thêm bộ kiểm chứng. Bộ này dựng một
  schema tạm ngay trong transaction đó, đổ schema nền cùng ba migration, rồi gọi service thật của
  ứng dụng qua lớp tương thích PostgreSQL. Nó kiểm tra thật việc chặn nộp trùng, tách namespace ID,
  giữ điểm cao, phiên hết hạn và RLS của view, bằng dữ liệu giả ID âm để không đụng chuỗi định danh
  đang chạy.
- **`db:audit`** ghi `db-audit.latest.json`: bảng, cột, ràng buộc, index, policy, quyền của `anon`
  và `authenticated`, trigger, view và số lượng bản ghi. Chỉ metadata và số đếm, không có nội dung
  tài khoản.
- **`db:admin`** tạo admin đầu tiên cho database rỗng, từ chối nếu đã có admin, và chặn mật khẩu quá
  72 byte vì bcrypt cắt âm thầm ở mốc đó.

`schema.sql` được dọn sạch tài khoản mẫu, email, chuỗi băm mật khẩu, lớp và nội dung cũ. Nay nó chỉ
còn cấu trúc, sáu dòng cấu hình mặc định và lệnh bật RLS toàn bộ bảng. Đây là bản nền để dựng
database rỗng, không dùng để nâng cấp database đang chạy.

## Kiểm chứng

| Hạng mục | Kết quả |
| --- | --- |
| `pnpm test:foundation` | 59/59 đạt, trong đó 10 test cho công cụ DB |
| `pnpm exec tsc --noEmit` | đạt |
| `pnpm build` | đạt |
| `pnpm db:check` trước apply | đạt, `committed:false` |
| `pnpm db:check` sau apply | đạt, `committed:false` |
| `git diff --check` | đạt |

Bài kiểm thử tích hợp chạy 52 câu lệnh SQL thật và sau khi rollback không để lại schema tạm nào.
Đây là lần đầu dự án có kiểm thử chạm PostgreSQL thật thay vì chỉ dùng dữ liệu giả.

ESLint trên các file của đợt này sạch. Lint toàn repo vẫn còn 422 lỗi cũ, gần hết là
`no-explicit-any` ở các file ngoài phạm vi, chưa dọn.

## Trạng thái trên Supabase

Ba migration đã apply và commit lúc 16:46 UTC ngày 18/09/2026, đích `05ca2564a33332d0`.

Đối chiếu ảnh chụp trước và sau: số bản ghi mọi bảng cũ giữ nguyên, 29 tài khoản còn nguyên, thay
đổi duy nhất là bảng `lesson_session_submissions` mới và đang rỗng. Không tài khoản nào bị tạo, sửa
hay xóa. Hai ảnh chụp nằm ở `db-audit.before-migrations.json` và `db-audit.latest.json`.

SQL hoàn tác cho cả ba migration nằm trong [README của database](../database/supabase/README.md).
Cả ba đều lùi được mà không mất dữ liệu học sinh, nhưng lùi 001 hoặc 002 sẽ làm code hiện tại hỏng,
nên chỉ lùi khi đồng thời quay lại bản code cũ.

## Lưu ý khi dùng bản sửa

1. **Code chưa deploy.** Sửa database không tự sửa website đang host. Cho tới khi code được triển
   khai, bản đang chạy vẫn ghi bài nộp của phiên luyện nhanh vào sai bảng. Bảng mới sẽ rỗng và bảng
   cũ sẽ nhận hàng có khóa ngoại trỏ sai chỗ.
2. **Điểm vẫn do client gửi.** Ràng buộc mới chỉ chặn nộp trùng, không làm điểm đáng tin hơn. Chưa
   có chấm điểm phía server.
3. **RLS bật nhưng chưa có policy nào.** Vai trò `anon` và `authenticated` vẫn giữ toàn bộ quyền
   bảng theo mặc định của Supabase, nên RLS không policy chính là thứ đang chặn Data API công khai.
   Đừng thêm policy cho tới khi quyết định rõ mô hình truy cập, vì thêm một policy lỏng sẽ mở lại
   đúng cánh cửa mà migration 003 vừa đóng.
4. **`created_by` của 29 tài khoản cũ vẫn trống.** Giáo viên chỉ thấy tài khoản do mình tạo, nên số
   tài khoản này hiện do admin quản lý. Không suy ra giáo viên từ thành viên lớp, vì một học sinh có
   thể học nhiều lớp.
5. **Quy tắc nộp bài** vẫn là một bài cuối cho mỗi học sinh mỗi phiên lớp. Trường `max_submissions`
   có trong schema nhưng chưa dùng.

## Việc nên làm tiếp

1. Commit và deploy code, rồi kiểm thử luồng giáo viên và học sinh trên môi trường thật. Đây là việc
   gấp nhất vì DB và code đang lệch phiên bản.
2. Chuẩn hóa `created_by` cho tài khoản cũ, cần quyết định của người dùng về việc gán ai cho ai.
3. Hợp nhất bốn hệ bảng phiên và bài tập: `sessions`, `lesson_sessions`, `assignments` cùng hai hệ
   contest. Migration 002 mới tách đúng quyền sở hữu bài nộp, chưa hợp nhất mô hình.
4. Thiết kế chấm điểm phía server cho bài nộp tính điểm.
5. Quyết định mô hình RLS thật nếu sau này muốn dùng Data API của Supabase, hoặc thu hồi hẳn quyền
   bảng của `anon` và `authenticated` nếu chắc chắn chỉ dùng kết nối server.
