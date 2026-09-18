# Vận hành cơ sở dữ liệu Supabase

Tài liệu cho người quản trị PyLearn Arena. Mọi lệnh chạy từ thư mục gốc dự án.

## Cấu hình

Đặt trong `.env.local`, không commit, không dán vào chat hay tài liệu:

| Biến | Vai trò |
| --- | --- |
| `SUPABASE_DB_URL` | Chuỗi kết nối PostgreSQL trực tiếp (không phải REST API key) |
| `SUPABASE_DB_SSL` | Đặt `false` chỉ khi chạy PostgreSQL nội bộ không TLS |
| `BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD` | Chỉ đặt tạm khi cần tạo admin đầu tiên, xóa ngay sau đó |

Công cụ dùng lại bộ đọc biến môi trường của Next nên thứ tự ưu tiên file giống lúc chạy web.

## Dấu vân tay đích

`db:status` in ra `target`, là mã băm 16 ký tự của host, cổng, tên database và user. Nó
không chứa mật khẩu. Mọi lệnh ghi đều bắt buộc truyền đúng `--target`, nên không thể lỡ tay
chạy migration lên nhầm project.

Đích hiện tại của lớp học: `05ca2564a33332d0`.

## Các lệnh

| Lệnh | Tác dụng | Có ghi vào DB không |
| --- | --- | --- |
| `pnpm db:status` | Liệt kê migration đã chạy và đang chờ | Không, transaction READ ONLY |
| `pnpm db:audit` | Ghi `docs/db-audit.latest.json`: bảng, cột, ràng buộc, index, policy, quyền, số lượng bản ghi | Không, transaction READ ONLY |
| `pnpm db:check` | Chạy thử toàn bộ migration đang chờ rồi chạy bộ kiểm chứng, sau đó ROLLBACK | Không, luôn rollback |
| `pnpm db:migrate --target=<fingerprint>` | Áp dụng migration đang chờ và COMMIT | Có |
| `pnpm db:init --target=<fingerprint>` | Dựng schema nền cho database rỗng rồi áp dụng migration | Có, từ chối nếu schema `public` đã có bảng |
| `pnpm db:admin --target=<fingerprint>` | Tạo tài khoản admin đầu tiên | Có, từ chối nếu đã tồn tại admin |

`db:check` là cổng bắt buộc trước `db:migrate`. Nó chạy đúng các câu lệnh của lần apply thật,
cộng thêm bộ kiểm chứng ràng buộc và một bài kiểm thử tích hợp dựng schema sạch rồi gọi
service thật của ứng dụng. Toàn bộ nằm trong một transaction bị rollback.

## Quy trình áp dụng thay đổi

1. `pnpm test:foundation` và `pnpm exec tsc --noEmit`.
2. `pnpm db:status` để lấy fingerprint và xác nhận danh sách chờ.
3. `pnpm db:audit`, lưu lại bản sao snapshot trước khi đổi.
4. `pnpm db:check`. Chỉ đi tiếp khi báo `verification: passed`.
5. `pnpm db:migrate --target=<fingerprint>`.
6. `pnpm db:status`, `pnpm db:audit`, `pnpm db:check` lại và đối chiếu số lượng bản ghi với snapshot.
7. Ghi kết quả vào `docs/HANDOFF_CLAUDE.md`.

Nếu lệnh apply bị ngắt giữa chừng, **không đoán** là đã commit hay đã rollback. Chạy
`pnpm db:status` để đọc sổ `pylearn_migrations.history` rồi mới quyết định.

## Cách viết migration mới

- Đặt tên `NNN_mo_ta_ngan.sql` trong `database/supabase/migrations/`, số tăng dần, không trùng.
- Mỗi lần apply chạy trọn trong một transaction kèm advisory lock, nên một file lỗi sẽ hủy cả đợt.
- **Không sửa file đã apply.** Runner lưu checksum và sẽ chặn. Muốn đổi thì thêm file mới.
- Viết câu lệnh chịu được chạy trên database đã có dữ liệu, ví dụ `ADD COLUMN IF NOT EXISTS`.
- Bảng mới phải `ENABLE ROW LEVEL SECURITY` vì Data API công khai của Supabase vẫn mở cho
  vai trò `anon` và `authenticated`. Quyền thật do API Next.js kiểm tra qua kết nối server.

## Sổ migration

Runner lưu lịch sử ở schema riêng `pylearn_migrations`, bảng `history`, đã thu hồi quyền của
`PUBLIC`. Schema `public` không bị thêm bảng phụ trợ nào.

## Hoàn tác ba migration nền

Cả ba đều chỉ thêm, không xóa dữ liệu học sinh. Nếu cần lùi, chạy theo thứ tự ngược rồi xóa
dòng tương ứng trong sổ. Lệnh dưới đây không có trong runner, chạy thủ công có chủ ý.

```sql
BEGIN;
-- 003
ALTER VIEW public.v_class_stats SET (security_invoker = false);
ALTER VIEW public.v_assignment_leaderboard SET (security_invoker = false);
-- 002: kiểm tra bảng rỗng trước khi xóa, đây là bài nộp của học sinh
SELECT count(*) FROM public.lesson_session_submissions;
DROP TABLE public.lesson_session_submissions;
ALTER TABLE public.session_submissions DROP CONSTRAINT session_submissions_session_user_key;
-- 001
DROP INDEX IF EXISTS public.idx_courses_order;
ALTER TABLE public.courses DROP COLUMN order_num;
DELETE FROM pylearn_migrations.history
WHERE name IN ('001_course_order.sql','002_session_submission_ownership.sql','003_view_security.sql');
COMMIT;
```

Lùi migration 001 hoặc 002 sẽ làm code hiện tại hỏng: danh sách khóa học sắp xếp theo
`order_num`, còn phiên luyện nhanh đọc ghi `lesson_session_submissions`. Chỉ lùi khi đồng thời
quay lại bản code cũ.

Supabase có bản sao lưu theo gói dịch vụ. Trước thay đổi lớn hơn phạm vi thêm cột, hãy kiểm tra
mục Database Backups trên bảng điều khiển dự án.

## Điều công cụ cố ý không làm

- Không tự xóa hay gộp bản ghi trùng. Bài nộp của học sinh chỉ được xóa bằng quyết định rõ ràng.
- Không ghi giá trị biến môi trường hay chi tiết lỗi PostgreSQL ra log, vì chúng có thể chứa
  chuỗi kết nối hoặc nội dung bản ghi.
- Không đụng tới lịch sử Git cũ. Ảnh chụp dump trước đây từng chứa tài khoản mẫu; `schema.sql`
  hiện tại chỉ còn cấu trúc và sáu dòng cấu hình mặc định.
