# 📚 Hướng Dẫn Sử Dụng Scripts

> **Quan trọng:** Tất cả dữ liệu hiện nay được lưu trong **MySQL Database**, không còn dùng JSON file nữa!

---

## 🎯 Tổng Quan

### Cấu trúc dữ liệu:

```
Course (Khóa học)
  └── Topic (Chương)
        └── Lesson (Bài học)
              └── Game (Trò chơi)
```

---

## ➕ THÊM MỚI

### 1️⃣ Thêm Game (phổ biến nhất)

```bash
npx tsx scripts/add-game.ts
```

**Script sẽ hỏi:**

- Lesson ID (chọn từ danh sách)
- Game slug (vd: `t10-cd-b12-id5`)
- Tên game
- Mô tả
- Thứ tự (1, 2, 3...)
- Path (vd: `python-basics/chapter-1/t10-cd-b12/id5`)

**Sau khi chạy script:**

1. ✅ Game đã được thêm vào MySQL
2. 📝 Tạo file code: `src/content/python-basics/chapter-1/t10-cd-b12/id5/index.ts`
   - Copy từ template: `src/content/_template/game-template-type1.ts` hoặc `type2.ts`
3. 🖼️ Thêm assets: `public/python-basics/chapter-1/t10-cd-b12/id5/bg.png`
4. 📦 Đăng ký trong `src/components/PlayGameContent.tsx`:

   ```typescript
   import initGame5 from "@/content/python-basics/chapter-1/t10-cd-b12/id5";

   const gameModules = {
     "python-basics/chapter-1/t10-cd-b12/id5": initGame5,
   };
   ```

5. 🧹 Clear cache: `rm -rf .next`
6. 🔄 Restart dev server

---

### 2️⃣ Thêm Lesson (Bài học)

```bash
npx tsx scripts/add-lesson.ts
```

**Script sẽ hỏi:**

- Topic ID
- Lesson slug (vd: `t10-cd-b13`)
- Tên bài học
- Mô tả
- Thứ tự

✅ Lesson đã sẵn sàng để thêm games!

---

### 3️⃣ Thêm Topic (Chương)

```bash
npx tsx scripts/add-topic.ts
```

**Script sẽ hỏi:**

- Course ID
- Topic slug (vd: `chapter-2`)
- Tên chương
- Mô tả
- Thứ tự

✅ Topic đã sẵn sàng để thêm lessons!

---

## 🗑️ XÓA

### 1️⃣ Xóa Game

```bash
npx tsx scripts/remove-game.ts <game-slug>
```

**Ví dụ:**

```bash
npx tsx scripts/remove-game.ts t10-cd-b12-id3
```

**Script tự động:**

- ✅ Xóa khỏi MySQL database
- ✅ Xóa folder code: `src/content/python-basics/chapter-1/t10-cd-b12/id3/`
- ✅ Xóa folder assets: `public/python-basics/chapter-1/t10-cd-b12/id3/`

**Bạn cần làm thêm:**

1. ❌ Xóa import trong `PlayGameContent.tsx`
2. 🧹 `rm -rf .next`
3. 🔄 Restart dev server

---

### 2️⃣ Xóa Lesson (và tất cả games trong đó)

```bash
npx tsx scripts/remove-lesson.ts <lesson-slug>
```

**Ví dụ:**

```bash
npx tsx scripts/remove-lesson.ts t10-cd-b12
```

**Script tự động:**

- ✅ Xóa tất cả games trong lesson khỏi database
- ✅ Xóa lesson khỏi database

**Bạn cần làm thêm:**

1. 🗂️ Xóa tất cả folders code của games
2. 🖼️ Xóa tất cả assets của games
3. ❌ Xóa imports trong `PlayGameContent.tsx`
4. 🧹 `rm -rf .next`
5. 🔄 Restart dev server

---

### 3️⃣ Xóa Topic (và tất cả lessons + games)

```bash
npx tsx scripts/remove-topic.ts <topic-slug>
```

**Ví dụ:**

```bash
npx tsx scripts/remove-topic.ts chapter-1
```

**⚠️ Cảnh báo:** Sẽ xóa toàn bộ:

- Topic
- Tất cả Lessons trong topic đó
- Tất cả Games trong các lessons đó

**Script tự động:**

- ✅ Xóa tất cả games, lessons, topic khỏi database

**Bạn cần làm thêm:** (như remove-lesson)

---

### 4️⃣ Xóa Course (xóa TOÀN BỘ khóa học!)

```bash
npx tsx scripts/remove-course.ts <course-slug>
```

**Ví dụ:**

```bash
npx tsx scripts/remove-course.ts python-basics
```

**⚠️⚠️⚠️ NGUY HIỂM:** Sẽ xóa:

- Course
- Tất cả Topics
- Tất cả Lessons
- Tất cả Games

**Script tự động:**

- ✅ Xóa toàn bộ khỏi database

**Bạn cần làm thêm:**

1. 🗂️ Xóa toàn bộ folder: `src/content/python-basics/`
2. 🖼️ Xóa toàn bộ assets: `public/python-basics/`
3. ❌ Clean up `PlayGameContent.tsx`
4. 🧹 `rm -rf .next`
5. 🔄 Restart dev server

---

## 🔧 SCRIPTS TIỆN ÍCH

### Xem cấu trúc database

```bash
npx tsx scripts/show-structure.ts
```

### Test kết nối MySQL

```bash
npx tsx scripts/test-mysql-connection.ts
```

### Reset mật khẩu admin

```bash
npx tsx scripts/reset-admin.ts
```

---

## 📝 LƯU Ý QUAN TRỌNG

### ✅ LUÔN NHỚ sau khi thêm/xóa:

1. Clear Next.js cache: `rm -rf .next`
2. Hard refresh browser: `Ctrl + Shift + R` (Windows) hoặc `Cmd + Shift + R` (Mac)
3. Restart dev server nếu cần

### 🗂️ Cấu trúc files:

```
pylearn_arena/
├── src/
│   └── content/
│       ├── _template/          # Templates mẫu
│       │   ├── game-template-type1.ts  # Function testing game
│       │   └── game-template-type2.ts  # CodeRunner game
│       └── python-basics/      # Course folder
│           ├── t10-cd-b12-id1/ # Game 1
│           └── t10-cd-b12-id2/ # Game 2
├── public/
│   ├── t10-cd-b12-id1/        # Game 1 assets
│   └── t10-cd-b12-id2/        # Game 2 assets
└── scripts/                    # All scripts here!
```

### 🎮 Game Templates:

- **Type 1:** Function testing (kiểm tra function return value)
- **Type 2:** CodeRunner (test với stdin/stdout)

---

## 🆘 KHI GẶP LỖI

### Lỗi: "Game not found in database"

→ Game đã bị xóa hoặc slug sai

### Lỗi: "Cannot connect to MySQL"

→ Check MySQL đang chạy: `mysql -u root -p`

### Game vẫn hiện trên web sau khi xóa

1. `rm -rf .next`
2. Restart dev server
3. Hard refresh browser (Ctrl + Shift + R)

### Lỗi import trong PlayGameContent.tsx

→ Nhớ xóa import và xóa trong `gameModules` object

---

## 💡 TIPS

- 🔢 **Thứ tự (order_num):** Bắt đầu từ 1, tăng dần (1, 2, 3...)
- 🏷️ **Slug naming:** Dùng format `t10-cd-b12-id1`, `id2`, `id3`...
- 📁 **Path:** Phải khớp với cấu trúc folder trong `src/content/`
- 🎨 **Assets:** Ít nhất cần file `bg.png` cho background

---

## 🚀 WORKFLOW HOÀN CHỈNH

### Thêm 1 game mới:

1. `npx tsx scripts/add-game.ts` → Nhập thông tin
2. Copy template → `src/content/python-basics/[slug]/index.ts`
3. Sửa logic game trong file index.ts
4. Thêm ảnh → `public/[slug]/bg.png`
5. Update `PlayGameContent.tsx` (import + gameModules)
6. `rm -rf .next`
7. Test game!

### Xóa 1 game:

1. `npx tsx scripts/remove-game.ts [slug]`
2. Xóa import trong `PlayGameContent.tsx`
3. `rm -rf .next`
4. Restart server
5. Done!

---

**📅 Updated:** January 19, 2026  
**✍️ Author:** PyLearn Arena Team
