# Hướng dẫn Hệ thống Quản lý PyLearn Arena

Tài liệu này hướng dẫn cách sử dụng hệ thống quản lý mới với 3 loại người dùng: Admin, Teacher, Student.

## 📋 Mục lục

1. [Cài đặt](#cài-đặt)
2. [Phân quyền](#phân-quyền)
3. [Hướng dẫn Admin](#hướng-dẫn-admin)
4. [Hướng dẫn Giáo viên](#hướng-dẫn-giáo-viên)
5. [Hướng dẫn Học sinh](#hướng-dẫn-học-sinh)
6. [API Reference](#api-reference)

---

## Cài đặt

### 1. Chạy Migration Database

```bash
npx tsx scripts/migrate-management.ts
```

Script này sẽ:

- Cập nhật bảng `users` với role `teacher` và các cột mới
- Tạo các bảng: `classes`, `class_members`, `course_access`, `assignments`, `submissions`, `rankings`, `notifications`, `activity_log`, `settings`
- Thêm tài khoản giáo viên mẫu

### 2. Tài khoản mặc định

| Username | Password | Role    |
| -------- | -------- | ------- |
| admin    | 123456   | Admin   |
| teacher1 | 123456   | Teacher |
| teacher2 | 123456   | Teacher |

---

## Phân quyền

### Admin

- ✅ Quản lý tất cả người dùng (tạo, sửa, xóa, khóa)
- ✅ Tạo tài khoản giáo viên và học sinh
- ✅ Quản lý tất cả lớp học
- ✅ Quản lý khóa học và nội dung (sửa tiêu đề, mô tả, ghi chú)
- ✅ Phân quyền khóa học theo lớp
- ✅ Xem thống kê hệ thống

### Teacher (Giáo viên)

- ✅ Tạo và quản lý lớp học của mình
- ✅ Thêm học sinh vào lớp
- ✅ Tạo tài khoản học sinh
- ✅ Tạo bài tập với thời hạn
- ✅ Xem và chấm bài nộp
- ✅ Tạo session nộp bài trực tiếp trong giờ học
- ✅ Gán khóa học cho lớp
- ❌ Không thể tạo/sửa khóa học
- ❌ Không thể tạo tài khoản giáo viên

### Student (Học sinh)

- ✅ Tham gia lớp bằng mã code
- ✅ Xem bài tập được giao
- ✅ Nộp bài và xem kết quả
- ✅ Xem xếp hạng (nếu được bật)
- ✅ Tham gia session nộp bài nhanh trong giờ học
- ❌ Không thể tự đăng ký (phải được tạo bởi GV/Admin)
- ❌ Chỉ được truy cập khóa học đã được gán cho lớp

---

## Hướng dẫn Admin

### Truy cập Dashboard

- URL: `/admin`
- Yêu cầu: Đăng nhập với tài khoản role `admin`

### Quản lý người dùng

#### Xem danh sách

Tại trang `/admin`, bạn sẽ thấy bảng danh sách tất cả người dùng.

#### Tạo người dùng mới

1. Click nút "➕ Thêm người dùng"
2. Điền thông tin:
   - Username (bắt buộc)
   - Email (bắt buộc)
   - Họ tên
   - Mật khẩu
   - Role: admin/teacher/student
3. Click "Tạo"

#### Khóa/Mở khóa tài khoản

- Click nút "🔒 Khóa" hoặc "🔓 Mở khóa" trong cột hành động

### Quản lý khóa học

#### Truy cập

1. Từ dashboard `/admin`, click "📚 Quản lý khóa học"
2. Hoặc truy cập trực tiếp: `/admin/courses`

#### Sửa nội dung khóa học

1. Click vào Course/Topic/Lesson/Game để expand
2. Click nút "✏️" bên cạnh item muốn sửa
3. Modal hiện ra với các trường:
   - **Course**: ID, Title, Description
   - **Topic**: ID, Title
   - **Lesson**: ID, Title, Notes
   - **Game**: ID, Type, Title, Description
4. Chỉnh sửa và click "Lưu"

### Phân quyền khóa học

1. Tại dashboard `/admin`, click "Quản lý lớp"
2. Chọn lớp muốn quản lý
3. Click tab "Khóa học"
4. Check/Uncheck các khóa học mà lớp được phép truy cập

---

## Hướng dẫn Giáo viên

### Truy cập Dashboard

- URL: `/teacher`
- Yêu cầu: Đăng nhập với tài khoản role `teacher`

### Quản lý lớp học

#### Tạo lớp mới

1. Click tab "Lớp học"
2. Click "➕ Tạo lớp mới"
3. Điền thông tin:
   - Tên lớp
   - Mô tả
   - Năm học
   - Khối lớp
   - Số học sinh tối đa
4. Click "Tạo lớp"

Hệ thống tự động tạo **mã lớp** (8 ký tự) để học sinh tham gia.

#### Thêm học sinh vào lớp

1. Click vào card lớp để vào trang chi tiết
2. Click "➕ Thêm học sinh"
3. Chọn cách thêm:
   - **Có sẵn**: Tìm và chọn học sinh đã có trong hệ thống
   - **Tạo mới**: Tạo tài khoản học sinh mới và thêm vào lớp

### Quản lý bài tập

#### Tạo bài tập

1. Click tab "Bài tập"
2. Click "➕ Tạo bài tập"
3. Điền thông tin:
   - **Tiêu đề**: Tên bài tập
   - **Mô tả**: Hướng dẫn cho học sinh
   - **Lớp**: Chọn lớp được giao
   - **Game**: Chọn game/bài học
   - **Thời gian bắt đầu/kết thúc**
   - **Cho phép nộp muộn**: Và % trừ điểm
   - **Số lần nộp tối đa**
   - **Hiển thị xếp hạng**
4. Chọn "Lưu nháp" hoặc "Mở ngay"

#### Mở/Đóng bài tập

- Tại trang chi tiết bài tập:
  - Click "📢 Mở bài tập" để publish
  - Click "🔒 Đóng bài tập" để kết thúc sớm

#### Xem và chấm bài

1. Click vào bài tập trong danh sách
2. Xem tab "Bài nộp" để thấy tất cả submissions
3. Click "Xem & Chấm" để:
   - Xem code học sinh
   - Điều chỉnh điểm thủ công
   - Thêm nhận xét

### Nộp bài trực tiếp (Session)

Tính năng cho phép giáo viên mở session trong giờ học để học sinh nộp bài và xem xếp hạng realtime.

#### Tạo Session

1. Tại dashboard `/teacher`, click "📊 Nộp bài trực tiếp"
2. Hoặc truy cập: `/teacher/sessions`
3. Click "➕ Tạo session mới"
4. Chọn:
   - Lớp học
   - Game/bài học
5. Click "Tạo session"
6. Hệ thống tạo **mã session** (6 ký tự)

#### Trong giờ học

1. Đưa mã session cho học sinh
2. Bật tùy chọn "Auto-refresh" để tự động cập nhật xếp hạng
3. Xem realtime:
   - Số người tham gia
   - Danh sách nộp bài với điểm, thời gian
   - Xếp hạng theo điểm cao → thời gian sớm

#### Đóng Session

- Click "🔒 Đóng session" khi kết thúc giờ học
- Session đã đóng vẫn có thể xem lịch sử

---

## Hướng dẫn Học sinh

### Truy cập Dashboard

- URL: `/student`
- Yêu cầu: Đăng nhập với tài khoản role `student`

### Tham gia lớp

1. Click "➕ Tham gia lớp"
2. Nhập mã lớp (8 ký tự, nhận từ giáo viên)
3. Click "Tham gia"

### Làm bài tập

1. Xem danh sách bài tập cần làm
2. Click vào bài tập
3. Tại tab "Làm bài":
   - Game sẽ được nhúng trong trang
   - Hoàn thành game và nộp bài
4. Xem kết quả tại tab "Lịch sử"
5. So sánh với bạn bè tại tab "Xếp hạng"

### Xem xếp hạng

- Mỗi bài tập có thể có bảng xếp hạng riêng
- Xếp hạng theo: Điểm cao nhất → Thời gian đạt được

### Nộp bài nhanh (Session)

Tính năng cho phép nộp bài trực tiếp trong giờ học theo yêu cầu của giáo viên.

#### Tham gia Session

1. Tại dashboard `/student`, click "📝 Nộp bài nhanh"
2. Hoặc truy cập: `/student/submit`
3. Nhập mã session (6 ký tự) từ giáo viên
4. Click "Tham gia"

#### Làm bài và nộp

1. Game được nhúng trong trang
2. Hoàn thành game
3. Bài nộp tự động gửi lên server
4. Xem xếp hạng realtime bên phải màn hình

#### Lưu ý

- Chỉ có thể nộp khi session đang mở
- Mỗi session có thể nộp nhiều lần
- Điểm và thời gian được ghi nhận ngay lập tức

---

## API Reference

### Authentication

```
POST /api/auth/login
Body: { username, password }
Response: { success, user, token }

GET /api/auth/me
Header: Authorization: Bearer <token>
Response: { success, user }

POST /api/auth/logout
Response: { success }
```

### Users (Admin only)

```
GET /api/admin/users
Query: ?page=1&limit=20&role=teacher&search=keyword
Response: { success, data: { items, total, page, limit } }

POST /api/admin/users
Body: { username, email, password, fullName, role }
Response: { success, data: { id, ... } }

GET /api/admin/users/[userId]
PUT /api/admin/users/[userId]
DELETE /api/admin/users/[userId]
PATCH /api/admin/users/[userId]  (suspend/activate)
```

### Classes (Teacher/Admin)

```
GET /api/classes
POST /api/classes
Body: { name, description, schoolYear, grade, maxStudents }

GET /api/classes/[classId]
PUT /api/classes/[classId]
DELETE /api/classes/[classId]

GET /api/classes/[classId]/members
POST /api/classes/[classId]/members
Body: { userId } or { username, email, fullName, password }
DELETE /api/classes/[classId]/members
Body: { userId }

POST /api/classes/join
Body: { code }

GET /api/classes/[classId]/courses
Response: { success, data: [{ course_id, ... }] }

POST /api/classes/[classId]/courses
Body: { courseId }

DELETE /api/classes/[classId]/courses
Body: { courseId }
```

### Sessions (Nộp bài trực tiếp)

```
GET /api/sessions
Response: { success, data: [{ id, code, status, ... }] }

POST /api/sessions
Body: { classId, lessonId, gameId }
Response: { success, data: { id, code, ... } }

GET /api/sessions/[code]
Response: { success, data: { session, rankings } }

POST /api/sessions/[code]
Body: { score, code: userCode, executionTime }

DELETE /api/sessions/[code]
(Close session)
```

### Admin Courses

```
GET /api/admin/courses
Response: { success, data: [...] }

PUT /api/admin/courses
Body: { type: "course|topic|lesson|game", id, data }
```

### Assignments

```
GET /api/assignments
Query: ?classId=1&status=published

POST /api/assignments
Body: { classId, gameId, title, description, startTime, endTime, ... }

GET /api/assignments/[assignmentId]
PUT /api/assignments/[assignmentId]
DELETE /api/assignments/[assignmentId]
PATCH /api/assignments/[assignmentId]
Body: { action: "publish" | "close" }
```

### Submissions

```
POST /api/submissions
Body: { assignmentId, code, result, isCorrect, executionTime }

GET /api/submissions/[submissionId]
PATCH /api/submissions/[submissionId]
Body: { score, feedback }  (Teacher grading)
```

---

## Cấu trúc Database

### Bảng chính

| Bảng                | Mô tả                                       |
| ------------------- | ------------------------------------------- |
| users               | Tất cả người dùng (admin, teacher, student) |
| classes             | Lớp học, mỗi lớp có 1 teacher               |
| class_members       | Quan hệ nhiều-nhiều giữa users và classes   |
| course_access       | Khóa học được gán cho lớp                   |
| assignments         | Bài tập, gắn với 1 class và 1 game          |
| submissions         | Bài nộp của học sinh                        |
| rankings            | Xếp hạng theo assignment                    |
| lesson_sessions     | Session nộp bài trực tiếp trong giờ học     |
| session_submissions | Bài nộp trong session                       |
| notifications       | Thông báo cho user                          |

### Sơ đồ quan hệ

```
users ──┬── classes (teacher_id)
        │
        ├── class_members ── classes
        │
        ├── course_access ── classes ── courses
        │
        ├── assignments ──┬── classes (class_id)
        │                 └── games (game_id)
        │
        ├── submissions ── assignments
        │              └── rankings
        │
        └── lesson_sessions ──┬── classes (class_id)
                              └── session_submissions ── users
```

---

## Xử lý lỗi thường gặp

### "Không có quyền truy cập"

- Kiểm tra role của tài khoản
- Đảm bảo đăng nhập với đúng loại tài khoản

### "Hết thời gian nộp bài"

- Bài tập đã quá hạn
- Liên hệ giáo viên nếu cần gia hạn

### "Đã hết lượt nộp"

- Đã nộp đủ số lần quy định
- Giáo viên có thể điều chỉnh maxAttempts

### Migration lỗi

- Kiểm tra kết nối database trong `.env.local`
- Đảm bảo bảng `courses` và `games` đã tồn tại

---

## Changelog

### v2.1.0 (Moodle-style Features)

- **Quản lý khóa học (Admin)**
  - Sửa tiêu đề, mô tả, ghi chú cho Course/Topic/Lesson/Game
  - Truy cập: `/admin/courses`
- **Phân quyền khóa học theo lớp**
  - Học sinh chỉ được truy cập khóa học khi được thêm vào
  - Giáo viên/Admin có thể gán khóa học cho từng lớp
- **Nộp bài trực tiếp trong giờ học**
  - Giáo viên tạo "session" với mã code
  - Học sinh join session và nộp bài
  - Xếp hạng realtime trong giờ học
  - Truy cập: `/teacher/sessions` và `/student/submit`

### v2.0.0 (Management System)

- Thêm role Teacher
- Hệ thống lớp học với mã tham gia
- Bài tập với thời hạn
- Xếp hạng học sinh
- Chấm điểm thủ công
- Thông báo
