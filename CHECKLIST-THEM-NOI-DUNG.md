# ✅ CHECKLIST - Thêm nội dung mới

## 📚 Thêm Khóa học mới

```bash
# Chạy script hoặc thêm trực tiếp vào database
npx tsx scripts/add-course.ts
```

**Yêu cầu:**

- ✅ Có `slug` (unique)
- ✅ Có `is_published = 1` để hiển thị
- ✅ Khóa học sẽ tự động hiện ở `/api/teacher/courses`
- ⚠️ Học sinh chỉ thấy khi giáo viên "Hiện khóa học" ở trang phân quyền

**Test:**

- [ ] Giáo viên vào `/teacher/course-access` thấy khóa mới
- [ ] Học sinh CHƯA thấy khóa (chưa được grant)
- [ ] Bấm "Hiện khóa học" → học sinh thấy khóa nhưng chưa vào được

---

## 📖 Thêm Chương (Topic) mới

```bash
npx tsx scripts/add-topic.ts
```

**Yêu cầu:**

- ✅ Có `course_id` (link đến course)
- ✅ Có `slug` và `order_num`
- ✅ Chương sẽ tự động hiện ở `/api/courses/{slug}/topics`
- ⚠️ Học sinh chỉ thấy khi giáo viên MỞ KHÓA chương đó

**Test:**

- [ ] Giáo viên vào `/teacher/course-access` thấy chương mới
- [ ] Học sinh CHƯA thấy chương (chưa unlock)
- [ ] Bấm nút 🔓 mở khóa chương → học sinh thấy chương

---

## 📝 Thêm Bài học (Lesson) mới

```bash
npx tsx scripts/add-lesson-new.ts
```

**Yêu cầu:**

- ✅ Có `topic_id` (link đến topic)
- ✅ Có `slug` và `order_num`
- ✅ Bài học sẽ tự động hiện ở `/api/courses/{slug}/topics/{id}/lessons`
- ⚠️ Học sinh chỉ thấy khi giáo viên MỞ KHÓA bài đó

**Test:**

- [ ] Giáo viên vào `/teacher/course-access` thấy bài mới
- [ ] Học sinh CHƯA thấy bài (chưa unlock)
- [ ] Bấm nút 🔓 mở khóa bài → học sinh thấy bài

---

## 🎮 Thêm Game mới

```bash
npx tsx scripts/add-complete-game.ts
```

**Yêu cầu:**

- ✅ Có trong database: `games` table với `lesson_id`, `path`
- ✅ Có code trong folder: `/src/content/{course}/{topic}/{lesson}/{game}`
- ✅ Có mapping trong: `PlayGameContent.tsx`
- ⚠️ `path` phải khớp với folder structure

**Test:**

- [ ] Game hiện trong lesson
- [ ] Click vào game → load được
- [ ] Submit code → chấm điểm được

---

## 📝 Tạo Session (Bài kiểm tra)

**Qua UI:**

1. Vào trang quản lý `/teacher`
2. Tab "Sessions"
3. Bấm "Tạo Session"
4. Chọn: Class, Game, Thời gian, Max submissions

**Qua API:**

```bash
POST /api/teacher/sessions
{
  "class_id": 1,
  "game_id": 1,
  "title": "Kiểm tra chương 1",
  "duration_minutes": 45,
  "max_submissions": 3
}
```

**Test:**

- [ ] Session hiện ở "📝 Bài kiểm tra đang mở" (student)
- [ ] Click vào → chơi game được
- [ ] Submit → lưu submission
- [ ] Hết max_submissions → không submit được nữa

---

## 🔄 Flow hoàn chỉnh

### Khi thêm nội dung mới:

1. **Thêm vào database** (dùng scripts)
   - Course → Topic → Lesson → Game

2. **Giáo viên phân quyền**
   - Vào `/teacher/course-access`
   - Chọn lớp + khóa học
   - Bấm "Hiện khóa học" (nếu khóa mới)
   - Bấm 🔓 mở khóa từng chương/bài

3. **Học sinh học**
   - Vào `/game` → thấy khóa học
   - Click khóa → thấy chương đã mở
   - Click chương → thấy bài đã mở
   - Click bài → chơi game

4. **Tạo Session (nếu cần)**
   - Giáo viên tạo session
   - Học sinh thấy ở "Bài kiểm tra đang mở"

---

## ⚠️ LƯU Ý

### Tránh lỗi khi thêm mới:

1. **Slug phải unique** - không trùng với course/topic/lesson khác
2. **order_num phải tăng dần** - để sắp xếp đúng thứ tự
3. **Foreign keys phải đúng:**
   - `topic.course_id` → `courses.id`
   - `lesson.topic_id` → `topics.id`
   - `game.lesson_id` → `lessons.id`

4. **Game path phải khớp:**

   ```
   Database: python-basics/chapter-1/lesson-1/game-1
   Folder:   /src/content/python-basics/chapter-1/lesson-1/game-1/index.ts
   ```

5. **Content ID types:**
   - Database: `id` là INT (number)
   - Code đã xử lý: convert String(id) khi so sánh
   - ✅ Không cần lo lắng về kiểu dữ liệu

6. **Permission cascade:**
   - Khóa CHƯƠNG → tất cả BÀI trong chương bị khóa
   - Mở CHƯƠNG → học sinh thấy chương nhưng cần mở từng bài
   - Ẩn KHÓA HỌC → học sinh không thấy khóa nữa

---

## 🧪 Test Checklist

Sau khi thêm nội dung mới, test theo thứ tự:

### 1. Test với Giáo viên

- [ ] Vào `/game` → thấy tất cả khóa
- [ ] Vào `/teacher/course-access` → thấy khóa/chương/bài mới
- [ ] Bấm nút phân quyền → không lỗi

### 2. Test với Học sinh (chưa được phân quyền)

- [ ] Vào `/game` → KHÔNG thấy khóa mới
- [ ] (Đúng - cần giáo viên grant trước)

### 3. Test phân quyền

- [ ] Giáo viên bấm "Hiện khóa học"
- [ ] Học sinh reload → thấy khóa
- [ ] Click khóa → KHÔNG thấy chương (chưa unlock)

### 4. Test unlock content

- [ ] Giáo viên mở khóa chương 1
- [ ] Học sinh reload → thấy chương 1
- [ ] Click chương 1 → KHÔNG thấy bài (chưa unlock)
- [ ] Giáo viên mở khóa bài 1
- [ ] Học sinh reload → thấy bài 1

### 5. Test game

- [ ] Học sinh click bài 1 → load game
- [ ] Submit code → chấm điểm
- [ ] Xem leaderboard

### 6. Test session

- [ ] Giáo viên tạo session với game mới
- [ ] Học sinh thấy "📝 Bài kiểm tra đang mở"
- [ ] Click session → chơi game
- [ ] Submit → lưu vào session
- [ ] Check max_submissions

---

## 🎯 KẾT LUẬN

### ✅ Hoạt động tốt khi thêm mới:

- Courses, Topics, Lessons (dynamic từ DB)
- Phân quyền theo content_id
- Sessions với game mới
- Teacher thấy tất cả content
- Student chỉ thấy content đã unlock

### ⚠️ Cần chú ý:

- Game phải có trong DB + folder + PlayGameContent.tsx
- Path phải khớp chính xác
- Giáo viên phải grant permission trước khi học sinh thấy

### 🚀 Workflow chuẩn:

1. Chạy script thêm content
2. Giáo viên vào phân quyền
3. "Hiện khóa học" + mở khóa chương/bài
4. Học sinh học bình thường
5. Tạo session khi cần kiểm tra
