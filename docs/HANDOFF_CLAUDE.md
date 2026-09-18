# Bàn giao cho Claude — 18/09/2026

## TRẠNG THÁI MỚI NHẤT — 18/09/2026, Claude Code tiếp nhận từ Codex

**Đọc phần này trước.** Phần "ĐIỂM TIẾP TỤC MỚI NHẤT" bên dưới là mốc dừng của Codex và vẫn
đúng về mô tả thay đổi; các dòng về kết quả kiểm tra ở đó đã bị phần này thay thế.

### Đã kiểm chứng xong

| Hạng mục | Kết quả |
| --- | --- |
| `pnpm test:foundation` | 59/59 PASS, gồm 2 test mới thêm trong đợt này |
| `pnpm exec tsc --noEmit` | PASS |
| `pnpm build` | PASS |
| ESLint trên các file của đợt nền tảng và đợt DB | Sạch |
| `pnpm db:status` | Kết nối thật OK, target `05ca2564a33332d0`, applied rỗng, 3 migration đang chờ |
| `pnpm db:check` | **PASS ngay lần đầu**, gồm cả `tests/integration/fresh-database.cjs`, `committed:false` |
| `pnpm db:audit` | Chạy lại, không thấy thay đổi từ bên ngoài |

ESLint toàn repo vẫn còn 422 lỗi cũ, gần hết là `no-explicit-any` ở các file ngoài phạm vi hai
đợt này. Không xử lý trong đợt DB.

### Điểm cần biết về fresh-database.cjs

File này Codex viết nhưng chưa chạy. Nay đã chạy và **đạt, không phải sửa gì**. Đã kiểm tra
riêng bằng một script đếm câu lệnh: test thực thi 52 câu lệnh thật và sau rollback còn **0**
schema tạm `pylearn_check_%` sót lại. Test không bị bỏ qua thầm lặng.

### Bổ sung trong đợt này

1. `tests/foundation/database-tools.test.cjs`: thêm 2 test cho hai nhánh Codex ghi là chưa được
   kiểm tra trực tiếp — ánh xạ lỗi PostgreSQL 23505 thành HTTP 409 khi hai request cùng nộp bài,
   và `db:init` từ chối database đã có bảng mà không chạy `CREATE`.
2. `database/supabase/README.md`: tài liệu vận hành DB, gồm bảng lệnh, quy trình apply, quy tắc
   viết migration mới và **SQL hoàn tác đầy đủ cho cả 3 migration**.
3. `docs/DATABASE_FIXES_2026-09-18.md`: báo cáo đợt DB, song song với báo cáo đợt nền tảng. Ghi ba
   lệch pha giữa code và DB cùng bằng chứng, bộ công cụ mới, kết quả kiểm chứng và việc nên làm tiếp.
4. `docs/db-audit.before-migrations.json`: snapshot trước khi apply, có đủ cả hai field mới
   views/history. Số liệu: 29 users (1 admin, 2 teacher, 26 student), 4 classes, 27 class_members,
   1 course, 1 topic, 2 lessons, 8 games, 6 settings, `duplicateSessionSubmissions: 0`.

`duplicateSessionSubmissions: 0` là bằng chứng ràng buộc UNIQUE của migration 002 áp được mà
không phải bỏ bài nộp nào.

### ĐÃ APPLY LÊN SUPABASE — 18/09/2026 lúc 16:46 UTC

`pnpm db:migrate --target=05ca2564a33332d0` chạy thành công, **`committed: true`**. Cả ba migration
đã vào sổ `pylearn_migrations.history` với checksum và thời điểm. `db:status` báo `pending: []`.

Lệnh này ban đầu bị môi trường Claude Code chặn vì xếp vào nhóm thao tác production. Người dùng đã
cấp quyền qua `.claude/settings.local.json` (đã thêm vào .gitignore, rule chỉ đúng `db:migrate`).

Đối chiếu `docs/db-audit.latest.json` với `docs/db-audit.before-migrations.json`:

| Kiểm tra | Kết quả |
| --- | --- |
| Số bản ghi mọi bảng cũ | Giữ nguyên, 29 users còn nguyên |
| Thay đổi duy nhất | Bảng mới `lesson_session_submissions`, đang rỗng |
| `courses.order_num` | integer, NOT NULL, default 0, có index `idx_courses_order` |
| Ràng buộc UNIQUE(session_id,user_id) | Có trên cả `session_submissions` và bảng mới |
| RLS | Bật trên toàn bộ bảng, kể cả bảng mới |
| Hai view | `security_invoker=true` |
| `db:check` chạy lại sau apply | PASS, `committed:false` |

Không tài khoản nào bị tạo, sửa hay xóa. Không bài nộp nào bị mất.

### Nhắc lại giới hạn vẫn còn nguyên

- Code local chưa commit, chưa deploy. Sửa DB xong **không** tự sửa website đang host. Luồng
  phiên luyện nhanh trên bản đang chạy vẫn ghi sai bảng cho tới khi code được triển khai.
- Chưa reset tài khoản, chưa chuẩn hóa `created_by` của 29 tài khoản cũ.
- Điểm luyện tập vẫn do client gửi lên; chưa có chấm điểm phía server.

---

## ĐIỂM TIẾP TỤC MỚI NHẤT — dừng theo yêu cầu người dùng, còn 14% limit

**Đọc phần này trước.** Phần nền tảng phía dưới đã hoàn thành từ đợt trước. Đợt DB vừa bắt đầu và **CHƯA HOÀN THÀNH**. Người dùng yêu cầu dừng để chuyển sang Claude Code; không phải hết việc hay bị chặn kết nối.

- Working directory: `E:\HTML_GAME\Game_For_School\WebLearnPY\LearnPythonWeb-main\pylearn_arena`, branch `main`, Windows PowerShell.
- Toàn bộ sửa đổi hai đợt vẫn ở working tree, gồm nhiều file untracked. **Chưa commit/push/deploy**. Mở cùng thư mục này; chỉ clone GitHub sẽ thiếu công việc.
- Đã kết nối Supabase thật thành công qua `SUPABASE_DB_URL` trong env local. Node 22.19.0, PostgreSQL 17.6. Sandbox mặc định trả EACCES; chạy command được cấp quyền mạng thì thành công. Không phải thiếu credential.
- Dấu vân tay DB đích do công cụ tính: **`05ca2564a33332d0`**. Đây không phải credential. Chạy lại `db:status` để đối chiếu; không đổi đích tùy tiện.
- **Chưa commit bất kỳ thay đổi DB nào. Chưa reset tài khoản.** Đã thực hiện truy vấn đọc và một lần chạy thử DDL/DML trong transaction rồi ROLLBACK thành công.
- Người dùng cho phép chuẩn hóa Supabase và có thể reset tài khoản nếu cần. Qua kiểm kê, ba migration hiện tại không cần xóa tài khoản; tài khoản và nội dung được giữ. Chưa chuẩn hóa `created_by` của tài khoản cũ.

### Hiện trạng DB thật đã kiểm kê

`docs/db-audit.latest.json` là snapshot metadata và số lượng, không có nội dung tài khoản/mật khẩu. Snapshot được tạo **trước migration**; mã audit đã được mở rộng thêm fields views/history sau lần chạy đó nên file hiện chưa có hai fields mới.

- 26 bảng public, tất cả đã bật RLS, chưa có policy.
- 29 users: 1 admin, 2 teacher, 26 student, đều active, tất cả created_by NULL.
- 4 classes, 27 class_members, 1 course, 1 topic, 2 lessons, 8 games.
- course_access 1, course_content_access 3, settings 6.
- sessions, session_submissions, lesson_sessions, contests và các bảng bài nộp khác đều rỗng tại thời điểm đọc.
- courses thiếu order_num; code trước đây che lỗi đọc bằng fallback nhưng cập nhật sắp xếp vẫn lỗi.
- LessonSessionService tạo lesson_sessions nhưng đọc/ghi session_submissions có FK tới sessions. Đã chuẩn bị tách bảng/code; DB thật chưa có bảng mới.
- Hai view v_class_stats/v_assignment_leaderboard được cấp SELECT cho anon/authenticated. Đã chuẩn bị security_invoker=true để view tuân RLS (tham khảo https://supabase.com/docs/guides/database/postgres/row-level-security#views).

### Thay đổi local của đợt DB đang dở

1. `database/supabase/migrations/001_course_order.sql`: bổ sung order_num, điền thứ tự cho giá trị NULL, giữ thứ tự đã cấu hình, index.
2. `002_session_submission_ownership.sql`: UNIQUE(session_id,user_id) cho bài nộp lớp; tạo lesson_session_submissions với FK riêng và RLS. Không tự di chuyển bài cũ theo ID trùng nhau. DB đã kiểm kê không có bài cũ, nhưng vẫn kiểm tra lại trước apply.
3. `003_view_security.sql`: hai view chạy với security_invoker=true.
4. `database/supabase/tools/connection.cjs`: dùng env parser của Next qua createRequire, fingerprint đích, timeout, lỗi không in secret. TLS giữ hành vi rejectUnauthorized:false hiện có của ứng dụng; chưa cải thiện chứng chỉ trong đợt này.
5. `tools/audit.cjs`: metadata/số lượng trong transaction READ ONLY; lưu docs/db-audit.latest.json.
6. `tools/migrate.cjs`: status/check/apply/init/check-init; ledger riêng pylearn_migrations.history, checksum chuẩn hóa CRLF, chặn migration đã sửa/mất/thứ tự lùi, advisory transaction lock, cả batch trong một transaction. Apply/init cần --target đúng; check luôn rollback. Init từ chối public schema có bảng.
7. `tools/bootstrap-admin.cjs`: tạo admin khi chưa có admin, không ghi đè tài khoản/mật khẩu; dùng BOOTSTRAP_ADMIN_* trong env, bcrypt 12, chặn mật khẩu >72 bytes. Chưa chạy trên DB thật vì đã có admin.
8. `tools/verify.cjs`: kiểm tra thật unique/FK, tách namespace ID, course order, RLS/view bằng fixture ID âm, luôn dưới transaction rollback của check. Không tăng sequence live với fixture public.
9. `database/supabase/schema.sql`: xóa seed tài khoản/email/hash/lớp/nội dung cũ và setval; chỉ giữ cấu trúc + 6 settings mặc định, bật RLS. Đây là baseline để init DB rỗng, không dùng nâng cấp DB đang có. Không cố xóa lịch sử Git chứa seed cũ.
10. `database/migrate-supabase.ts`: entrypoint cũ chuyển sang runner apply, không chạy lại dump.
11. `package.json`: db:status, db:audit, db:check, db:migrate, db:admin; đổi db:init và db:supabase sang runner.
12. `src/lib/services/courses.ts`: bỏ fallback che lỗi thiếu order_num; LessonSessionService dùng lesson_session_submissions và atomic best-score upsert thay SELECT rồi UPDATE/INSERT. Chưa thiết kế lại toàn bộ phân quyền/validation/thời hạn của API legacy sessions; các vấn đề đó còn lại.
13. `src/lib/services/sessionSubmissions.ts`: map PostgreSQL 23505 của unique mới sang lỗi 409.
14. `tests/foundation/database-tools.test.cjs`: 8 test mới cho checksum/order, rollback, bootstrap không ghi đè, bảng riêng và upsert, lỗi course không bị che.
15. `tests/integration/fresh-database.cjs`: **VỪA VIẾT, CHƯA CHẠY**. Tạo schema riêng trong outer transaction rollback để thử baseline+migration và gọi service thật qua PgCompat với client được tiêm. Kiểm tra bài lớp, bài nhanh cùng ID, giữ điểm cao, duplicate/expired, stats; transaction service được bọc savepoint để không commit fixture. `verify.cjs` vừa được nối gọi test này.

### Kết quả kiểm tra ở mốc dừng

- `pnpm.cmd test:foundation`: **57/57 PASS**, vừa chạy lại ngay trước khi bàn giao.
- `pnpm.cmd exec tsc --noEmit`: PASS sau các thay đổi TypeScript của đợt DB. Các file mới thêm sau đó là CJS.
- `node database/supabase/tools/migrate.cjs check`: một lần PASS trên Supabase, báo applied cả 3 tên migration, **committed:false**, rollback thành công. Lần này mới có verify.cjs phiên bản đầu (unique/FK/views), **chưa có fresh-database.cjs**.
- `db:check` phiên bản hiện tại có thêm test fresh database **CHƯA CHẠY LẠI**, có thể cần debug. Đừng ghi rằng toàn bộ integration đã pass.
- Chưa chạy build/ESLint cho toàn bộ đợt DB; kết quả build ở phần đợt nền tảng phía dưới là kết quả cũ.
- Không có tiến trình command/server đang chạy khi bàn giao.

### Việc Claude Code làm ngay tiếp theo

1. Đọc diff và các file mới; review runner/migration/verify, nhất là fresh-database.cjs chưa chạy. Đừng apply ngay chỉ vì lần check trước đã pass.
2. Chạy `pnpm.cmd db:status`, rồi `pnpm.cmd db:check` với kết nối mạng được phép. Check hiện tạo schema thử và rollback; không chạy file integration rời ngoài transaction.
3. Sửa lỗi nếu check mới thất bại; chạy kiểm tra foundation, TypeScript, lint phù hợp và build. Có thể bổ sung test mapping 23505 ở service và bảo vệ init nếu cần; hai nhánh này chưa được kiểm tra trực tiếp đầy đủ.
4. Review rollback/backup phù hợp cho 3 migration additive. Không dùng script reset/cleanup cũ. Khi đủ kiểm chứng, người dùng đã yêu cầu sửa DB nên có thể chạy `pnpm.cmd db:migrate --target=05ca2564a33332d0` trên đúng đích (đối chiếu lại fingerprint).
5. Ngay sau apply, ghi trạng thái rõ vào file này, chạy db:status/db:check/db:audit và đối chiếu số lượng dữ liệu. Nếu command apply bị ngắt, kiểm tra ledger trước khi chạy lại; không suy đoán đã rollback hay đã commit.
6. Code local mới cần các migration này. **Chưa deploy code nên sửa bảng không tự sửa hành vi website đang host**; đặc biệt website cũ vẫn dùng sai bảng ở luồng lesson session cho đến khi code được triển khai. Không tuyên bố toàn bộ website đã sửa xong.
7. Viết hướng dẫn DB vận hành riêng (README trong database/supabase chưa được viết), cập nhật báo cáo đợt DB. Giữ tài khoản cũ trừ khi quyết định reset trong phạm vi người dùng đã cho phép; chuẩn bị bootstrap nếu reset. created_by còn thiếu, không tự gán giáo viên chỉ từ lớp học.

### Nhật ký migration tại mốc dừng

| Migration | Trạng thái trên Supabase |
| --- | --- |
| 001_course_order.sql | CHƯA ÁP DỤNG — đã chạy thử rồi rollback |
| 002_session_submission_ownership.sql | CHƯA ÁP DỤNG — đã chạy thử rồi rollback |
| 003_view_security.sql | CHƯA ÁP DỤNG — đã chạy thử rồi rollback |

Ledger pylearn_migrations.history cũng nằm trong lần check đã rollback, chưa tạo lâu dài. Khi nhận việc phải kiểm tra lại thực tế để phát hiện thay đổi từ bên ngoài.

**Cập nhật 18/09/2026 bởi Claude Code: bảng trên đã LỖI THỜI.** Cả ba migration nay **ĐÃ ÁP DỤNG**
và commit lên Supabase lúc 16:46 UTC cùng ngày. Xem phần trạng thái ở đầu tài liệu để biết kết quả
đối chiếu. Bảng dưới giữ lại làm lịch sử mốc dừng của Codex, không phải trạng thái hiện tại.

---

**Các phần dưới là bàn giao đợt nền tảng ban đầu. Những câu “chưa kết nối/chưa kiểm thử DB thật” ở đó đã được cập nhật bởi phần mới nhất phía trên; các giới hạn nghiệp vụ khác vẫn còn.**

## Đọc trước khi làm

Đây là điểm tiếp nhận công việc nếu cuộc trò chuyện Codex bị hết limit. Không cần lịch sử chat để bắt đầu. Đọc hướng dẫn AGENTS.md áp dụng cho thư mục nếu có, sau đó đọc:

1. `docs/FOUNDATION_FIXES_2026-09-18.md`: sửa đổi đã hoàn thành, kiểm chứng và giới hạn.
2. `docs/ARCHITECTURE_AUDIT_2026-09-18.md`: kiểm toán kiến trúc ban đầu; một số vấn đề đã được sửa theo tài liệu số 1.
3. `git status --short`, `git diff --stat`, rồi diff và các file mới liên quan đến hạng mục sẽ tiếp tục.

Đọc tài liệu bằng UTF-8 (PowerShell: `Get-Content -Encoding UTF8`).

## Mục tiêu và quyết định của người dùng

- Website học Python/game cho học sinh đã chạy, nhưng chức năng được thêm dần nên cần chuẩn hóa từng đợt vừa phải, giảm chồng chéo và thuận tiện biên soạn lâu dài. Giữ các chức năng hữu dụng, không viết lại toàn bộ.
- Content Manager/CMS là công cụ admin biên soạn game **cố ý để local và bị Git ignore**. Không coi đó là lỗi cần đưa lên Git; giữ quy trình này.
- Người dùng muốn đợt tiếp theo chuẩn hóa cả DB trên Supabase. Người dùng nói có thể xóa toàn bộ tài khoản và tạo lại vì chưa đưa vào sử dụng. Đây là quyền cho phép reset tài khoản khi thực hiện đợt DB, không phải cho phép xóa mọi dữ liệu hoặc drop toàn bộ schema.
- Chưa bắt đầu đợt DB: cần kiểm tra đúng project/kết nối, schema thật và quan hệ phụ thuộc trước. Không mặc định cấu trúc trên Supabase giống file SQL trong repo. Nếu reset tài khoản, phải có cách tạo lại admin và xử lý rõ dữ liệu phụ thuộc; không tự cascade xóa nội dung không nằm trong phạm vi.
- Không gửi secret vào chat/tài liệu/Git. Dùng cấu hình local và công cụ được cấp quyền. Không ghi giá trị biến môi trường ra log.
- Trao đổi bằng tiếng Việt. Làm theo từng đợt hoàn chỉnh có kiểm chứng; không cố tiêu hết quota bằng thay đổi không cần thiết.

## Trạng thái chính xác tại thời điểm bàn giao

- Các sửa đổi đợt nền tảng chỉ nằm trong working tree local, **chưa commit, push hoặc deploy**.
- **Chưa chạy migration nào trên Supabase; chưa sửa schema hoặc dữ liệu DB thật; chưa xóa hay tạo tài khoản thật.**
- Đã sửa logic truy cập DB trong code, nhưng kiểm thử DB dùng mock. Chưa có kiểm thử tích hợp PostgreSQL thật.
- Chưa xác minh cấu hình production, bao gồm JWT_SECRET.
- Không có công việc sửa DB đang chạy dở tại thời điểm tạo file này.
- File này được tạo để phòng hết limit, không có nghĩa đợt nâng cấp tiếp theo đã hoàn tất. Nếu code hoặc DB đổi sau mốc này, đối chiếu thực tế và cập nhật bàn giao.

## Đợt nền tảng đã hoàn thành

- JWT HS256 chung và kiểm tra role/status từ DB; loại cookie JSON không ký ở các API legacy đã sửa.
- Sửa mapper tài khoản, created_by, phạm vi giáo viên quản lý học sinh và trạng thái khóa tài khoản.
- Kiểm tra quyền chủ lớp ở các API course access, tạo contest và session liên quan.
- Sửa bulk unlock lệch tham số SQL; grant và unlock trong transaction.
- Tách service nộp bài: kiểm tra payload, thành viên lớp, hạn nộp; khóa hàng session, chặn bài trùng, cập nhật thống kê cùng transaction.
- Dùng chung điều kiện session đang mở; hỗ trợ auto_close=false đến khi giáo viên đóng.
- Trang play chọn đúng sessionId, giữ qua login, dùng game_path của session và chặn phản hồi cũ ghi đè ngữ cảnh mới.
- Sửa cache auth và phản hồi refresh chậm ghi đè login/logout mới.

Các file chính: `src/lib/authToken.ts`, `apiAuth.ts`, `classAccess.ts`, `auth.ts`, `playSession.ts`, `sessionPolicy.ts`; `src/lib/services/users.ts`, `courseAccess.ts`, `sessions.ts`, `sessionSubmissions.ts`; các route và trang được liệt kê trong git diff.

## Kiểm chứng đã thực hiện ở đợt trước

- `pnpm.cmd test:foundation`: 49/49 đạt.
- `pnpm.cmd exec tsc --noEmit`: đạt.
- `pnpm.cmd build`: đạt sau khi có mạng tải Google Fonts; còn cảnh báo workspace root do lockfile thư mục cha.
- ESLint phần nền tảng/test đã sửa đạt. Lint toàn repo chưa sạch: trang teacher/accounts còn lỗi cũ và trang danh sách session còn cảnh báo hook cũ.
- `git diff --check`: đạt.
- Browser QA localhost với API mock: đăng nhập/cache, chọn session hợp lệ/không hợp lệ, chạy game bằng Pyodide thật và nộp bài mock, phiên đóng thủ công.
- Đây là kết quả đợt trước, không phải xác nhận mọi thay đổi tương lai. Chạy lại kiểm tra phù hợp sau khi sửa.

## Giới hạn cần giữ trong nhận thức

- Điểm luyện tập vẫn do client cung cấp; chưa có chấm điểm server đáng tin cậy.
- Quy tắc hiện tại: một bài nộp cuối/học sinh/session. Chưa kích hoạt max_submissions.
- Tài khoản cũ thiếu created_by chỉ admin quản lý; reset được người dùng cho phép có thể thay nhu cầu gán lại, nhưng chưa thực hiện.
- Mới hợp nhất đường mở khóa; đường khóa/thu hồi và ngữ nghĩa assigned/visible/unlocked cần tiếp tục chuẩn hóa.
- sessions, lesson_sessions, assignments và hai hệ contest chưa hợp nhất. Không xóa bảng chỉ vì tên trùng ý nghĩa; phải tìm luồng sử dụng.
- API legacy progress/submissions mới sửa auth, chưa thiết kế lại toàn bộ nghiệp vụ.

## Hướng làm tiếp ưu tiên

1. Kiểm kê schema/code DB và cơ chế migration hiện có; kiểm tra kết nối Supabase bằng cách không lộ secret. Nếu không truy cập được, nói rõ giới hạn và chuẩn bị migration local có thể review, không khẳng định đã sửa DB thật.
2. Đối chiếu schema thật với `database/supabase/schema.sql`, constraints, indexes, foreign keys và các câu SQL trong service. Lập một đợt migration vừa phải dựa trên bằng chứng; lưu file migration trong repo.
3. Nếu reset tài khoản, kiểm kê phụ thuộc, chuẩn bị phục hồi/backup phù hợp và quy trình bootstrap admin. Quyền xóa tài khoản đã được người dùng cho phép; không mở rộng thành xóa mọi dữ liệu.
4. Kiểm thử luồng giáo viên/học sinh và transaction với PostgreSQL thật trên môi trường phù hợp; ghi rõ môi trường nào đã được thay đổi.
5. Sau nền DB: thống nhất quyền khóa học, hợp đồng kết quả game và phiên bản nội dung theo báo cáo. Ưu tiên một hạng mục hoàn chỉnh mỗi đợt.

## Quy tắc giữ trạng thái và bàn giao tiếp

- Không reset/checkout sạch working tree: các sửa đổi chưa commit chính là phần công việc đã hoàn thành.
- Ba file có sẵn của người dùng, chưa được đợt sửa này đụng tới:
  - `public/qrcode_pylearn-arena.vercel.app.png`
  - `src/content/python-basics/chapter-1/t10-cd-b12/id1/index.ts.backup.1781460400368`
  - `src/content/python-basics/chapter-1/t10-cd-b12/id4/index.ts.backup.1781445193067`
- Windows PowerShell: dùng `pnpm.cmd`/`npx.cmd` nếu execution policy chặn script .ps1.
- Cập nhật file này sau mỗi đợt. Với DB, ghi tên migration và trạng thái CHƯA CHẠY/ĐÃ CHẠY/THẤT BẠI, môi trường và kết quả; không ghi credential. Trước khi chạy lại phải kiểm tra migration history/schema thật.
- Nếu bị gián đoạn trong lúc migration, trạng thái chưa xác minh phải được ghi là CHƯA XÁC MINH; không suy đoán thành công từ file local.

## Nhật ký DB

Tại 18/09/2026, thời điểm tạo bàn giao: **chưa thực hiện migration/reset/ghi dữ liệu lên Supabase**.

Claude Code tiếp nhận cùng ngày và **đã ghi thay đổi cấu trúc lên Supabase lúc 16:46 UTC**:
ba migration 001, 002, 003 được apply và commit sau khi `db:check` đạt. Thay đổi hoàn toàn mang
tính bổ sung. Không tạo, sửa hay xóa tài khoản và bản ghi nào; số lượng bản ghi mọi bảng cũ giữ
nguyên. Chưa reset tài khoản. Đường hoàn tác nằm trong `database/supabase/README.md`.
