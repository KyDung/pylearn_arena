**Đánh giá kiến trúc và lộ trình chuẩn hóa PyLearn Arena — 18/09/2026**

> Báo cáo này mô tả thời điểm trước khi sửa. Phần xác thực, phân quyền, mở khóa và nộp bài theo phiên đã được xử lý một phần trong [đợt sửa nền tảng ngày 18/09/2026](FOUNDATION_FIXES_2026-09-18.md); xem tài liệu đó để biết kết quả kiểm chứng và phần còn lại. Content Manager được giữ local theo yêu cầu của chủ dự án.

**Kết luận**

Dự án đã có nền tảng sử dụng được và có thể nâng cấp từng phần. Nợ kỹ thuật đáng kể tập trung ở quy tắc nghiệp vụ, hợp đồng dữ liệu và quy trình tạo nội dung. Một số lỗi đã nhìn thấy trực tiếp trong mã; vì thế việc ứng dụng build được chưa đủ để khẳng định các cơ chế phối hợp đúng.

Đề xuất giữ Next.js, React, PostgreSQL/Supabase, Phaser và Pyodide; chuẩn hóa thành một ứng dụng có các mô-đun nghiệp vụ rõ ràng. Ưu tiên sửa quyền truy cập và bài nộp, sau đó tách nội dung khỏi bộ máy chạy game, rồi hợp nhất phần dùng chung của giao bài/phiên làm bài/cuộc thi. Chuyển đổi theo từng luồng để có thể quay lại phiên bản trước.

**Phạm vi và mức độ kiểm chứng**

- Kiểm kê mã trên máy, gồm cả các thư mục bị Git bỏ qua: 169 tệp trong `src`, 74 API route, 34 page route, 14 tệp service, 11 mô-đun nội dung `index.ts` (bao gồm ví dụ/thử nghiệm).
- Đọc và lần theo các luồng xác thực, quản lý tài khoản/lớp, mở khóa khóa học, chạy game/Python, giao bài, phiên làm bài, cuộc thi, nộp bài, xếp hạng và biên soạn nội dung. Đối chiếu SQL, script, kiểu dữ liệu và tài liệu hướng dẫn.
- `pnpm exec tsc --noEmit --incremental false`: thành công.
- `pnpm build`: thành công. Có cảnh báo nhiều lockfile làm Next.js suy luận workspace root ở thư mục cha. Build trên máy vẫn chứa `/dev/content-manager`, `/api/dev/*` và `/admin/cms`.
- `pnpm exec eslint src scripts database --format json ...`: 432 lỗi, 129 cảnh báo trên 212 tệp được kiểm tra. Có 375 thông báo `no-explicit-any`; đây là số vấn đề quy chuẩn, không phải số chức năng hỏng. Kết quả bao gồm mã công cụ local và bản sao `.ts`.
- Thử nghiệm cô lập bằng mã service thật, thay DB bằng dữ liệu giả: xác nhận tài khoản `suspended` bị ánh xạ thành `active`; `createdBy` bị mất; bộ lọc `createdBy/status` không đi vào SQL; bulk unlock sinh 5 tham số chờ nhưng truyền 6 giá trị cho một nội dung. Kiểm tra thêm xác nhận JWT không đọc được bằng `JSON.parse`.
- Không chạy migration, reset, cleanup hay thử nộp bài trên dữ liệu thật. Chưa kiểm tra schema thực tế trên Supabase, cấu hình triển khai, lưu lượng hoặc toàn bộ UI bằng trình duyệt. Các ảnh hưởng phụ thuộc dữ liệu/schema đang chạy được ghi riêng bên dưới.
- Chỉ tạo báo cáo này; không thay đổi mã ứng dụng. Các tệp chưa được Git theo dõi đã tồn tại trước khi đánh giá được giữ nguyên.

**1. Bản đồ hệ thống hiện tại**

| Mảng | Thành phần đang tồn tại | Nhận xét |
| --- | --- | --- |
| Xác thực | JWT cookie, `apiAuth.ts`, `/auth/login`, `/auth/me`, localStorage, cookie `user-info` | Có nền tảng chung nhưng một số API vẫn dùng định dạng cookie cũ; trạng thái tài khoản không được truyền đúng |
| Cấu trúc nội dung | Course → Topic → Lesson → Game | Phân cấp phù hợp, có thể giữ |
| Biên soạn | Content Manager local, CMS, script tạo game, sửa trực tiếp `index.ts` | Nhiều đường ghi cùng một nội dung, có đường sửa AST và đường thay chuỗi/regex |
| Thực thi | Các game Phaser tự chứa giao diện/chấm bài, `codingSet.ts`, Pyodide dùng chung | Đã có helper chung nhưng bộ máy game vẫn bị sao chép giữa bài |
| Quyền học | `course_access`, `class_course_settings`, `course_content_access` | Ý nghĩa “được gán”, “hiển thị”, “được học” chưa tách rõ |
| Giao/nộp bài | `assignments`, `sessions`, `lesson_sessions`, hai service contest | Cùng xử lý thời gian, số lượt, điểm và xếp hạng theo nhiều cách |
| Dữ liệu | PostgreSQL qua lớp tương thích MySQL, script MySQL cũ, JSON legacy | Cần xác định một đường truy cập và một quy trình migration chính thức |

Những phần nên tận dụng: phân cấp khóa học, helper `withAuth`/`canManageClass`, các service đã tách, editor dùng chung, metadata/output-diff helper và cấu trúc `CodingSetConfig`. Đặc biệt, `id7/index.ts` đã chủ yếu chứa dữ liệu và gọi `initCodingSet`; đây là hướng phù hợp để nhân rộng.

**2. Các lỗi và rủi ro cần xử lý trước**

P0 dưới đây nghĩa là xử lý trước khi mở rộng sử dụng, đặc biệt khi có nhiều giáo viên hoặc dùng điểm làm kết quả đánh giá. P1 là lỗi nhất quán cần sửa ở đợt chuẩn hóa đầu. P2 là cải thiện khả năng bảo trì/vận hành.

| Mã | Ưu tiên | Phát hiện, bằng chứng và tác động | Hướng xử lý |
| --- | --- | --- | --- |
| A01 | P0 | `src/lib/services/users.ts:28` luôn trả `status: "active"`. `withAuth` kiểm tra trạng thái từ chính kết quả này; `/auth/login` cũng không đọc trạng thái. Đã tái hiện bằng bản ghi giả `suspended`. | Đọc trạng thái thực, kiểm tra ở login và mọi request có xác thực; test tài khoản khóa/xóa mềm với token đã cấp trước đó. |
| A02 | P0 | `users.ts:89` nhận nhưng bỏ qua `createdBy/status`; `createUser` tại dòng 141 không lưu `created_by`; mapper không trả `createdBy`. API list đặt bộ lọc nhưng SQL không lọc; API GET/PUT lại kiểm tra thuộc tính không có. Giáo viên có thể thấy danh sách rộng hơn dự định nhưng không quản lý được học sinh của mình. | Chốt quyền theo quan hệ lớp/quản lý; lưu `created_by` để truy vết, sửa mapper và bộ lọc. Không coi “người tạo tài khoản” là quyền sở hữu duy nhất nếu học sinh học nhiều lớp. |
| A03 | P0 | `src/app/api/admin/users/[userId]/route.ts:130` cho teacher PATCH suspend/activate mà không kiểm tra phạm vi mục tiêu như GET/PUT/DELETE. `src/app/api/teacher/course-access/route.ts:60`, show-course, hide-course thiếu kiểm tra chủ lớp. POST teacher contests cũng không kiểm tra sở hữu lớp. | Dùng chung policy kiểm tra người thực hiện, hành động và đối tượng; test giáo viên A thao tác tài nguyên của B, cả trường hợp nhắm tới tài khoản admin. |
| A04 | P0 | `src/app/api/submissions/route.ts:18,78`, `src/app/api/progress/route.ts:18`, `src/app/api/admin/users/template/route.ts:13` đọc auth cookie bằng `JSON.parse` thay vì xác minh JWT. Cookie hợp lệ từ login không đọc được; cookie JSON tự tạo có thể được các nhánh này coi là danh tính. | Đưa các API này về cùng cơ chế xác minh; bỏ tin cậy ID/role lấy trực tiếp từ JSON cookie. |
| A05 | P0/P1 | `src/app/api/student/sessions/[id]/submit/route.ts:24` và API contest nhận `score`, số test, kết quả đúng từ client rồi lưu. Test cases cũng có trong mã gửi tới trình duyệt. Đây là kết quả tự báo, chưa phải điểm được máy chủ xác minh. | Với luyện tập, ghi rõ nguồn kết quả. Với đánh giá chính thức, nhận code + phiên bản đề, chấm lại trong môi trường cô lập hoặc có giáo viên xác nhận. Kiểm tra miền giá trị ở API chỉ là bước đầu, không ngăn được giả kết quả. |
| A06 | P1 | `sessions.ts:175` chỉ kiểm tra `status='active'`; danh sách học sinh lại lọc thời lượng ở dòng 222. API nộp không kiểm tra hạn. Một phiên hết giờ nhưng chưa chuyển trạng thái vẫn có thể nhận request trực tiếp. `auto_close` cũng chưa được dùng nhất quán. | Một hàm `canSubmit` dựa trên thời gian máy chủ, trạng thái, thành viên và số lượt; dùng cho cả GET lẫn POST. |
| A07 | P1 | POST session kiểm tra “đã có bài chưa” rồi INSERT riêng; schema `session_submissions` tại dòng 325 không có unique `(session_id,user_id)`. Hai request đồng thời có thể vượt quy tắc một bài. Trường `max_submissions` tồn tại nhưng route hiện luôn chặn sau một bài và route tạo không nhận cấu hình này. | Chốt quy tắc một hay nhiều lượt. Một lượt: unique + xử lý xung đột. Nhiều lượt: transaction khóa bản ghi lượt làm, kiểm tra quota và ghi bài; thêm khóa chống gửi trùng. |
| A08 | P1 | `src/lib/services/courseAccess.ts:175` bulk unlock tạo mỗi hàng 6 giá trị nhưng chỉ có 5 dấu `?`. Đã kiểm tra bằng gọi service với DB giả. Bulk/single unlock cũng không cập nhật `course_access` giống nhau. | Sửa SQL và gom một đường cập nhật quyền trong transaction; test mở từng bài và mở hàng loạt cho kết quả tương đương. |
| A09 | P1 | API `/student/courses` không xét `course_access.is_active/expires_at`, trong khi `CourseAccessService.userHasCourseAccess` có xét. `removeCourseFromClass` cho rằng content access tự cascade, nhưng schema không có FK từ content access tới class-course-settings. hide-course xóa luôn cấu hình mở khóa. | Tách việc gán khóa học, ẩn/hiện và quyền học; quy định rõ thao tác nào giữ cấu hình. Dùng một policy truy cập nội dung. |
| A10 | P1 | `src/app/student/assignment/[assignmentId]/page.tsx:111` chờ `data.data.assignment` dạng snake_case; API chi tiết trả `data` là đối tượng assignment trực tiếp dạng camelCase. Iframe dùng `?game=...&assignment=...` tại dòng 311, còn `/play` đọc `path/sessionId`. | Sửa hợp đồng API và tuyến player; thêm kiểm thử đi hết luồng từ mở bài tới nộp và xem kết quả. |
| A11 | P1 | `LessonSessionService` trong `courses.ts:794` tạo `lesson_sessions`, nhưng ghi/xem `session_submissions`; schema hiện tại FK của `session_submissions.session_id` trỏ `sessions`. Nếu hai loại có cùng ID số, có thể lẫn dữ liệu; nếu không có ID tương ứng sẽ lỗi FK. | Kiểm tra DB thực trước chuyển đổi. Tách namespace ID và adapter cho dữ liệu cũ; ngừng tạo mới bằng luồng cũ sau khi xác định còn dùng hay không. |
| A12 | P1 | Teacher contest API dùng `contests-new.ts` với trạng thái published/ongoing; student detail và contest integration dùng `contests.ts` với active. Hai service còn dùng single-game/multi-game, cấu hình số lượt và bảng xếp hạng khác nhau. `contests-new.ts:367` đặt `is_ended` bằng `NOW() <= end_time`, ngược ý nghĩa ở nhánh kiểm tra. Chưa thấy caller của `canSubmit` trong mã ứng dụng đã tìm. | Chọn một contract contest; chuyển trạng thái qua adapter. Lỗi helper là xác nhận ở mã, mức ảnh hưởng thực tế phụ thuộc việc helper được dùng. |
| A13 | P1 | Player có fallback lấy session đầu tiên khi path không khớp (`src/app/play/page.tsx:218`), thay vì xác nhận đúng phiên/bài. Contest lookup tìm một cuộc thi theo game với `LIMIT 1`; route nộp kiểm tra kết quả đó thay vì membership của đúng contest đích. | Player nhận context rõ ràng; nếu phiên không hợp lệ thì báo lỗi. Policy phải dùng đúng `activityId`, `classId`, `exerciseId`; không suy đoán từ game. |
| A14 | P1 | GET `/api/contests/[contestId]/submit` trả xếp hạng cho người đã đăng nhập mà không kiểm tra lớp/`show_ranking`; `getGameRankings` trả `cs.*`, gồm cả code. Bảng xếp hạng từng game lấy bài cuối, bảng tổng lấy điểm cao nhất; hai quy tắc có thể cho kết quả khác nhau. | DTO bảng điểm không chứa code; policy công bố điểm và quyền đọc; một quy tắc chọn bài và phá hòa được viết rõ. |
| A15 | P1 | `/api/courses/.../games` và `/api/games/info` cung cấp metadata/path mà không kiểm tra quyền học; `/play` chủ yếu kiểm tra user cache trên client. Nếu “khóa bài” có nghĩa cấm truy cập, cơ chế hiện tại chưa thực thi đầy đủ ở máy chủ. | Xác định bài nào công khai và bài nào hạn chế; bảo vệ dữ liệu/đề hạn chế trên server. Không gọi việc giấu link là kiểm soát truy cập. Nội dung đã gửi trong bundle client không thể xem là test bí mật. |

Các phát hiện trên là kết quả đọc mã và một số thử nghiệm cô lập, không phải khẳng định đã có người khai thác hoặc dữ liệu thật đã sai.

**3. Vì sao càng thêm chức năng càng dễ chồng chéo**

**Ba chiều khác nhau đang bị trộn vào “game”.** Một bài có yêu cầu Python và bộ test; một game có hình ảnh/hiệu ứng/cách kể chuyện; một phiên dạy học có lớp, hạn nộp và luật tính điểm. Hiện nhiều tệp game phải biết cả editor, runtime, chấm bài, session, contest và HTML. Thêm một quy tắc nộp bài vì thế kéo theo sửa nhiều game.

Nên tách:

- `Exercise`: đề bài, starter code, chế độ `function` hoặc `stdin`, quy tắc so sánh, bộ test, thang điểm, phiên bản.
- `Presentation`: console, câu chuyện Phaser hoặc dạng khác. Game riêng có thể có scene/asset tùy biến nhưng dùng chung giao diện trao đổi kết quả.
- `ExerciseSet`: danh sách bài theo thứ tự và trọng số, kế thừa hướng của Coding Set.
- `Activity`: cách giao nội dung cho lớp — luyện tập, bài tập, kiểm tra trong giờ, cuộc thi. Dùng chung policy truy cập/nộp bài nhưng giữ phần riêng như giải thưởng và công bố bảng điểm.
- `Attempt/Submission`: bài làm, ngữ cảnh giao bài, phiên bản đề, thời điểm máy chủ nhận, kết quả chấm và nguồn chấm.

**Nhiều nguồn quyết định cùng một thuộc tính.** Tiêu đề/đường dẫn có trong DB và file game; script còn cập nhật JSON legacy. Cần một nguồn biên soạn chính thức cho nội dung, DB quản lý thông tin vận hành, và cơ chế đồng bộ có phiên bản. Có bản sao phục vụ đọc nhanh là hợp lý nếu biết rõ bản nào làm chuẩn và cách cập nhật.

**Service và API chưa có ranh giới rõ.** `courses.ts` dài 953 dòng, chứa cả Course/Topic/Lesson/Game, quyền học và lesson session; đồng thời có `topics.ts`, `lessons.ts`, `games.ts` riêng. Nhiều route tự viết SQL và quy tắc, nên sửa service không sửa được tất cả hành vi.

**Bộ máy chạy game bị nhân bản.** `id4/index.ts` dài 1.281 dòng; `codingSet.ts` dài 1.234 dòng. Có game trả cleanup, có game như `id1` không trả cleanup dù component host có cơ chế gọi. Nhiều game dùng `@ts-nocheck`; do đó TypeScript qua chưa đảm bảo các hợp đồng runtime đúng.

Nên để host sở hữu editor, runtime, lifecycle và nút nộp. Mỗi renderer nhận `Exercise`, kết quả chạy và callbacks; trả một controller có `getAnswers`, `onResult`, `dispose`. Tiến tới thay `window.gameInstance`, truy vấn DOM toàn trang và polling gắn nút bằng tham chiếu/callback có kiểu rõ ràng. Có adapter cho game cũ để chuyển từng bài.

**Python chưa được cô lập giữa các lần chạy.** `pyodideLoader.ts` giữ một runtime trên `window`; `sessionGrading.ts` và `codingSet.ts` chạy mã trong globals chung, chỉ dọn một số biến I/O. Biến/hàm/import của học sinh có thể còn lại cho lần chạy sau. I/O grading còn có hai chuẩn: `.trim()` và chỉ bỏ newline cuối, nên cùng output có thể được chấp nhận khác nhau.

Đề xuất một runner dùng Web Worker, hàng đợi chạy, ngữ cảnh mới cho mỗi testcase và kết quả có cấu trúc; có hủy chạy/reset runtime, giới hạn output và bài nộp. Timeout `sys.settrace` hiện tại có ích nhưng không phải giới hạn thực thi cứng. Worker giúp tách tính toán Python khỏi giao diện; xem [hướng dẫn chính thức Pyodide](https://pyodide.org/en/stable/usage/webworker.html). Khi dùng interrupt buffer phải kiểm tra yêu cầu SharedArrayBuffer và headers theo [tài liệu interrupt](https://pyodide.org/en/stable/usage/keyboard-interrupts.html), đối chiếu đúng phiên bản 0.29.x trước triển khai.

Worker ở trình duyệt không làm điểm đáng tin hơn về mặt chống sửa kết quả. Nếu cần chấm chính thức trên server, runner phải nằm trong môi trường cô lập có hạn CPU/RAM/thời gian/output và hạn chế mạng, không chạy Python học sinh trực tiếp trong tiến trình Next.js.

**4. Chuẩn hóa việc tạo bài để sử dụng lâu dài**

Phương án ban đầu phù hợp với mã hiện tại: giữ Content Manager như công cụ biên soạn local, đưa mã công cụ vào Git, và công bố nội dung qua một quy trình có kiểm tra. Nếu nhu cầu là soạn trực tiếp trên website bằng nhiều máy, chuyển phần lưu bản nháp sang DB/object storage ở giai đoạn sau.

Quy trình đích:

1. Chọn khóa → chủ đề → bài học; tạo hoặc nhân bản bài tập/bộ bài.
2. Nhập yêu cầu, ví dụ, code ban đầu, lời giải tham khảo riêng và test cases theo schema chung.
3. Chọn cách hiển thị: console hoặc một renderer game; chọn asset trong thư viện.
4. Xem trước bằng chính player/runner học sinh sử dụng; chạy lời giải trên toàn bộ test.
5. Kiểm tra ID, điểm, test, asset, tham chiếu phân cấp và nội dung chưa công bố.
6. Công bố một phiên bản bất biến; xem trước thay đổi trước khi cập nhật danh mục DB.
7. Giáo viên chọn lớp, nội dung, chế độ và thời gian để giao bài; không phải sửa template game.

Các yêu cầu thiết kế cụ thể:

- Dùng ID nội dung ổn định, không dùng đường dẫn thư mục hoặc tiêu đề làm danh tính nghiệp vụ. Đổi chương/chủ đề không làm mất tiến độ, bài nộp hoặc draft.
- `content.json`/manifest có `schemaVersion`, `contentId`, `revision`, `kind`, đề, test, renderer và asset references. Chỉ chứa dữ liệu; renderer TypeScript là mã dùng chung. Lời giải riêng/test bí mật phải có gói server riêng nếu cần đánh giá chính thức.
- Nguồn chuẩn ban đầu: file manifest được Git quản lý. Bảng danh mục DB là bản công bố có revision/hash, được đồng bộ bằng một lệnh; không cho nhiều công cụ tự sửa metadata cùng lúc.
- Công bố và đồng bộ có `dry-run`, kiểm tra chênh lệch và khả năng chạy lại an toàn. Không coi việc ghi file và ghi DB là một transaction; cần trạng thái draft/published và bước phục hồi khi một bên thất bại.
- Phiên làm bài ghim revision đề/test/thang điểm. Sửa đề tạo revision mới; bài nộp cũ vẫn giải thích được theo đề cũ. Chấm lại phải có lịch sử, không âm thầm ghi đè điểm đã công bố.
- Tạo bài thông thường chỉ thêm dữ liệu và asset. Game có cơ chế mới mới cần viết renderer mới.

Hiện `.gitignore` loại toàn bộ Content Manager/CMS và API tương ứng khỏi Git, nhưng build trên máy vẫn chứa chúng. Git ignore không phải cơ chế tắt route production. Cần theo dõi mã công cụ để tái tạo được môi trường, đồng thời tách app authoring hoặc chặn rõ chức năng authoring khi chạy production. Một số endpoint chẩn đoán như `api/dev/courses-simple` không có auth; các route tạo/sửa chính có kiểm tra admin, nên không nên đánh đồng tất cả route dev là không xác thực.

**5. Kiến trúc đích vừa sức bảo trì**

```text
src/
  app/                         trang và route mỏng
  features/
    identity/                  tài khoản, phiên đăng nhập, policy quyền
    classroom/                 lớp, thành viên, cấp quyền học
    content/                   danh mục, schema nội dung, revision
    activities/                giao bài, kiểm tra, cuộc thi
    submissions/               lượt làm, bài nộp, chấm, bảng điểm
  player/
    host/                      editor, lưu nháp, điều phối nộp bài
    runtime/                   Pyodide worker và giao thức thực thi
    renderers/                 console, game Phaser, adapter legacy
  shared/                      API contracts, UI dùng chung, logging
  server/
    db/                        PostgreSQL, transaction, migrations
    policies/                  kiểm tra quyền dùng chung
content/                       manifest được quản lý phiên bản
tools/authoring/                biên soạn và công bố nội dung
```

Đây là cấu trúc định hướng; không cần di chuyển hàng loạt ngay. Thứ tự phụ thuộc nên là route → policy/service nghiệp vụ → repository DB. UI dùng DTO chung; DB dùng snake_case, DTO dùng camelCase nhất quán; thời điểm qua API là chuỗi ISO, không khai báo như `Date` đã được khôi phục tự động.

Thiết kế API có schema kiểm tra lúc chạy: ID, enum, thời gian hợp lệ, số lượt, độ dài code, số test/điểm và giới hạn phân trang. Định dạng kết quả thống nhất `{ success, data, error }`, lỗi có mã ổn định. Không dùng chuỗi thông báo tiếng Việt như điều kiện phân quyền, như GET assignment hiện đang làm. Kiểm tra quyền tập trung tại tầng truy cập dữ liệu/route phù hợp với [hướng dẫn Next.js](https://nextjs.org/docs/app/guides/authentication).

Với ghi bài nộp, cập nhật lượt và điểm phải có transaction, ràng buộc DB và chống gửi trùng. Chỉ bọc `COUNT` rồi `INSERT` trong transaction mặc định chưa đủ để loại race; cần khóa bản ghi lượt làm/quota hoặc ràng buộc phù hợp. [PostgreSQL mô tả cơ chế khóa hàng](https://www.postgresql.org/docs/current/explicit-locking.html).

**6. Cơ sở dữ liệu, triển khai và vận hành**

- `src/lib/db.ts` đang chuyển `?` thành `$n`, chuyển `IN (?)` thành `ANY`, tự thêm `RETURNING id`. Có thể giữ tạm làm adapter cũ, nhưng code mới nên dùng PostgreSQL trực tiếp qua một repository; chuyển dần và kiểm thử câu lệnh trước khi bỏ adapter.
- `package.json` trỏ DB init về Supabase, nhưng `validate-content`, `sync-content`, `add-complete-game` vẫn dùng MySQL. Validator còn tìm import tĩnh trong player đã chuyển sang dynamic import. Các lệnh mang tên “chuẩn” hiện chưa kiểm tra đúng hệ thống đang chạy.
- `database/migrate-supabase.ts` chạy toàn bộ schema, chưa có sổ phiên bản migration. `CREATE TABLE IF NOT EXISTS` không tự nâng cấp cột/ràng buộc của bảng đã có. Tách migration có số thứ tự/checksum khỏi seed demo và tài khoản khởi tạo.
- Schema chứa seed tài khoản, email và hash mật khẩu giống dữ liệu sử dụng thật. Tách khỏi bản schema chia sẻ, thay bằng dữ liệu tổng hợp; đánh giá nguồn gốc trước khi coi là demo. Báo cáo không lặp lại những giá trị đó.
- JWT secret hiện có fallback cố định trong nhiều tệp. Production phải từ chối khởi động nếu thiếu secret; một nơi quản lý cấu hình. Một số script cũ cũng chứa fallback mật khẩu DB cần loại bỏ.
- Chuẩn hóa thời gian: các trường lịch hiện là `timestamp` không có timezone. Chọn UTC cho lưu trữ/API và hiển thị Asia/Ho_Chi_Minh; việc chuyển dữ liệu cũ phải xác định timezone gốc trước.
- `on delete cascade` ở một số quan hệ có thể xóa lịch sử học khi xóa nội dung/lớp. Ưu tiên archive cho bản ghi đã có bài nộp, quy định riêng thao tác xóa vĩnh viễn và khả năng khôi phục.
- Tách môi trường development/staging/production và DB tương ứng. Có backup trước migration và diễn tập restore. Không dùng bộ script reset/cleanup cũ làm quy trình vận hành thường ngày.
- Thiết lập CI: typecheck, lint baseline không tăng lỗi, validate nội dung offline, kiểm thử nghiệp vụ trên DB tạm, build. Loại backup `.ts` khỏi source được build/typecheck sau khi đã lưu an toàn.
- Logging có request ID, actor, activity/submission ID và thời gian xử lý; hạn chế in code học sinh/thông tin đăng nhập. Theo dõi lỗi nộp bài, lỗi tải runtime và thời gian tải game. Chưa có dữ liệu tải để kết luận cần cache, realtime hay thêm server.

**7. Lộ trình chuyển đổi và điều kiện nghiệm thu**

| Đợt | Công việc | Điều kiện hoàn thành |
| --- | --- | --- |
| 0. Chốt hiện trạng | Lập danh sách luồng đang dùng, đánh dấu legacy/ẩn/đang phát triển; lưu công cụ authoring trong Git; dựng staging và backup/restore; ghi baseline kiểm thử | Một checkout mới dựng lại được app và công cụ tạo bài; biết schema hiện hành và cách khôi phục |
| 1. Sửa tính đúng | A01–A09; secret/auth thống nhất; contract API cho luồng đang dùng; hết giờ/số lượt/chống gửi trùng; phân loại nguồn điểm | Teacher A không thao tác lớp B; tài khoản khóa bị từ chối; bài nộp không vượt hạn/lượt khi gửi đồng thời |
| 2. Chuẩn hóa nội dung | Schema manifest, revision, validator đúng PostgreSQL/offline, một đường publish, tách config khỏi renderer; chuyển một bài mẫu và một Coding Set | Tạo bài mới không sao chép engine; sửa nội dung không sửa player; bài nộp cũ vẫn mở được theo revision cũ |
| 3. Chuẩn hóa player | Runner worker, chuẩn so sánh output, ngữ cảnh sạch, controller/lifecycle chung; adapter game cũ | Chuyển qua lại game không giữ instance cũ; chạy lỗi/hết giờ không mất draft; các loại bài dùng cùng luật chấm |
| 4. Gom hoạt động học | Contract Activity/Attempt chung; giữ policy riêng cho assignment/session/contest; map dữ liệu legacy; giải quyết A10–A14 | Một player nhận context rõ; cùng bài dùng ở nhiều lớp/phiên không lẫn kết quả; bảng điểm thống nhất và đúng quyền |
| 5. Đơn giản hóa vận hành | Dashboard lớp và thư viện bài, nhân bản bộ bài, mẫu cấu hình giao bài, CI và nhật ký, archive đường cũ | Giáo viên hoàn thành quy trình tạo → xem trước → công bố → giao → xem kết quả từ một lối đi chính |

Không ước lượng lịch cứng trước khi xác nhận những luồng thầy thực sự dùng và dữ liệu đang tồn tại. Có thể ưu tiên Content Manager + học tự do + session vì mã trang học sinh hiện ghi chú ưu tiên sessions; đây là suy luận từ mã, không phải xác nhận về thói quen sử dụng của thầy.

Cách di chuyển dữ liệu: tạo cấu trúc mới bổ sung, giữ bảng cũ, chuyển thử trên bản sao DB, đối chiếu số bản ghi/điểm/quyền, gắn bảng ánh xạ `(legacy_type, legacy_id)`. Chuyển từng luồng sang đọc/ghi mới qua adapter hoặc feature flag; tránh duy trì hai đường ghi độc lập lâu dài. Chỉ loại bỏ đường cũ khi không còn caller và đã đối chiếu dữ liệu. Chuẩn bị rollback cả cấu hình lẫn dữ liệu phát sinh sau khi chuyển.

**8. Bộ kiểm thử bảo vệ việc dạy học**

1. Đăng nhập ba vai trò; khóa tài khoản khi token còn hạn; request dùng cookie sai định dạng; thiếu secret production.
2. Hai giáo viên, hai lớp và một học sinh học nhiều lớp: kiểm tra quyền xem/sửa/lấy bảng điểm/khóa tài khoản, không chỉ kiểm tra nút hiển thị.
3. Gán khóa, hết hạn, thu hồi, ẩn rồi hiện, mở riêng lesson/mở topic/mở hàng loạt: API và UI thống nhất.
4. Phiên chưa mở, đang mở, đúng mốc hết giờ, bị đóng thủ công; kiểm tra thời gian từ máy chủ và timezone.
5. Hai request nộp đồng thời và gửi lại sau khi mất mạng: không vượt lượt và không tạo bài trùng; lỗi cập nhật stats không để dữ liệu nửa chừng.
6. Một bài dùng trong hai phiên/hai lớp/hai cuộc thi: kết quả gắn đúng context; giữ đường dẫn cũ qua adapter có kiểm soát.
7. Code thay đổi sau khi chạy thử; bài thiếu; score/test tự báo không hợp lệ; điểm chưa xác minh không bị coi là điểm chính thức.
8. Output có khoảng trắng, dòng trống, Unicode, thiếu input, lỗi Python, chương trình dài, output quá lớn; chạy lại không thừa biến/hàm của lần trước.
9. Đề v1 đã có bài nộp, công bố v2, đổi tên/chuyển thư mục, archive bài: vẫn xem/chấm lại lịch sử đúng phiên bản.
10. Một luồng đầy đủ với mỗi loại bài mẫu: tạo → xem trước → công bố → giao lớp → làm → nộp → xem điểm; triển khai lại từ checkout sạch vẫn chạy.

Ưu tiên test những bất biến nghiệp vụ trên thay vì phủ số lượng lớn test cho component tĩnh. Bổ sung đo tải bằng quy mô lớp sử dụng thực tế sau khi các luồng đã đúng.

**Việc nên bắt đầu trước tiên**

Một đợt sửa nền tảng có phạm vi hẹp: trạng thái tài khoản, phạm vi giáo viên, JWT API cũ, hợp đồng nộp session và bulk unlock; kèm các test hồi quy tương ứng. Song song ở mức tài liệu, chốt từ điển nội dung/hoạt động/điểm và lưu công cụ tạo bài vào Git. Sau đợt này mới chuyển một bài sang manifest + renderer chung để kiểm chứng cách tạo bài thuận tiện hơn trước khi nhân rộng.
