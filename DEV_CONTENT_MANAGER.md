# 🛠️ Dev Content Manager

**⚠️ DEVELOPMENT ONLY** - Trang này chỉ hoạt động khi `NODE_ENV=development` và sẽ bị Git ignore.

## 📍 Truy cập

```
http://localhost:3001/dev/content-manager
```

## ✨ Tính năng

### 1. ➕ Add Course

Tạo khóa học mới với:

- Slug (URL-friendly)
- Title, Description
- Difficulty (beginner/intermediate/advanced)
- Published status

### 2. ➕ Add Topic

Tạo chương mới:

- Chọn Course
- Slug, Title, Description
- Order Index

### 3. ➕ Add Lesson

Tạo bài học mới:

- Chọn Course → Topic (cascade)
- Slug, Title, Description, Summary
- Order Index

### 4. 🎮 Add Game

Tạo game mới **+ auto-tạo files**:

- Chọn Course → Topic → Lesson (cascade)
- Slug, Title, Type (type1/type2), Points
- Order Index

**Auto-creates:**

```
public/{course}/{topic}/{lesson}/{game}/
src/content/{course}/{topic}/{lesson}/{game}/index.ts
```

File `index.ts` được copy từ template (`src/content/_template/`) theo type.

### 5. 🗑️ Delete (CASCADE)

**⚠️ NGUY HIỂM - Cascade delete tất cả nội dung con!**

- **Delete Game**: Xóa game + progress + course_content_access
- **Delete Lesson**: Xóa lesson + tất cả games + related data
- **Delete Topic**: Xóa topic + tất cả lessons + games + related data
- **Delete Course**: Xóa course + topics + lessons + games + class_course_settings

Cascade dropdowns giúp chọn đúng item cần xóa.

## 🔒 Bảo mật

1. **Environment Check**: Chỉ hoạt động khi `NODE_ENV !== "production"`
2. **Git Ignored**: Không push lên repository
3. **API Protection**: Tất cả `/api/dev/*` đều check development mode

## 📝 Workflow

### Tạo game mới:

1. **Add Course** (nếu chưa có)
2. **Add Topic** (chọn course)
3. **Add Lesson** (chọn course + topic)
4. **Add Game** (chọn course + topic + lesson)
   - Nhận đường dẫn file: `src/content/{path}/index.ts`
   - Mở file và code game logic
   - File template đã có structure cơ bản

### Xóa nội dung:

1. Vào tab **🗑️ Delete**
2. Chọn loại (Game/Lesson/Topic/Course)
3. Dùng cascading dropdowns chọn item
4. Click DELETE → Confirm (⚠️ không thể undo!)

## 🎯 Lợi ích

✅ Không cần chạy scripts CLI  
✅ UI trực quan với dropdown cascading  
✅ Auto-tạo folder + file structure  
✅ Validate ngay trên form  
✅ Preview đường dẫn sau khi tạo  
✅ Cascade delete an toàn (transaction)  
✅ Không lo push nhầm lên production

## ⚙️ Database Tables

Các bảng được ảnh hưởng:

- `courses`, `topics`, `lessons`, `games`
- `course_content_access` (unlock status)
- `class_course_settings` (class-course mapping)
- `progress` (student progress)

## 🚫 Lưu ý

- **Files không tự động xóa** khi delete game (cần xóa manual)
- **TypeScript errors** kiểm tra bằng: `pnpm exec tsc --noEmit`
- **Database backup** trước khi xóa nội dung quan trọng
- **Production**: Trang này 404 khi deploy

## 🔧 Tech Stack

- **Backend**: Next.js API Routes
- **Services**: `src/lib/services/courses.ts` (cascade functions)
- **Database**: MySQL với transaction support
- **File System**: Node.js `fs/promises` để tạo folders/files

## 📚 Related Files

```
src/app/dev/
  layout.tsx              # NODE_ENV check
  content-manager/
    page.tsx              # UI chính

src/app/api/dev/
  courses/route.ts        # CRUD courses
  topics/route.ts         # CRUD topics
  lessons/route.ts        # CRUD lessons
  games/route.ts          # CRUD games + file creation

src/lib/services/courses.ts
  - createCourse/Topic/Lesson/Game()
  - deleteCourseCascade/Topic/Lesson/Game()
```

---

**Made with ❤️ for PyLearn Arena Developers**
