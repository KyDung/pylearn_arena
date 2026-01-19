# 📚 HƯỚNG DẪN THÊM KHÓA HỌC VÀ BÀI HỌC

## 🎯 Tổng Quan

Hệ thống này cho phép bạn dễ dàng tạo khóa học và bài học mới chỉ bằng vài bước đơn giản. Mỗi bài học là một game tương tác với Python.

---

## 🚀 Quy Trình Thêm Bài Học Mới

### Bước 1: Tạo Game Mới

Chạy lệnh sau và làm theo hướng dẫn:

```bash
npx tsx scripts/generate-game.ts
```

Script sẽ hỏi các thông tin:

- **Course ID**: ID của khóa học (vd: `python-basics`)
- **Game ID**: ID của game (vd: `t10-cd-b12-id5`)
- **Tiêu đề**: Tên hiển thị của game
- **Tên hàm Python**: Tên hàm mà học sinh cần viết
- **Mô tả**: Hướng dẫn chi tiết (nhập nhiều dòng, Enter 2 lần để kết thúc)

**Kết quả:**

- File game được tạo tại: `src/content/{courseId}/{gameId}/index.ts`
- Thư mục assets: `public/{gameId}/`

### Bước 2: Tùy Chỉnh Game

Mở file `src/content/{courseId}/{gameId}/index.ts` và chỉnh sửa:

#### 2.1. Cấu hình game (GAME_CONFIG)

```typescript
const GAME_CONFIG = {
  title: "Tên game của bạn",
  description: `
    Hướng dẫn chi tiết
    - Yêu cầu 1
    - Yêu cầu 2
  `,
  pythonFunction: "ten_ham",
  starterCode: `def ten_ham(param):
    # Code mẫu
    return result`,

  testCases: [
    {
      input: "hello",
      expected: "olleh",
      description: "Test đảo ngược",
    },
    // Thêm nhiều test cases
  ],

  assets: {
    background: "/{gameId}/bg.png",
    sounds: {
      correct: "/sound_global/correct.mp3",
      wrong: "/sound_global/wrong.mp3",
    },
  },
};
```

#### 2.2. Thêm assets (hình ảnh, âm thanh)

Đặt file vào thư mục `public/{gameId}/`:

- `bg.png` - Background (khuyến nghị 720x520px)
- Các file âm thanh khác (nếu cần)

#### 2.3. Tùy chỉnh Phaser scene (nếu cần)

Trong hàm `startPhaser()`, bạn có thể:

- Thêm sprites, animations
- Tạo UI elements
- Xử lý tương tác

### Bước 3: Thêm Lesson Vào Database

Chạy lệnh:

```bash
npx tsx scripts/add-lesson.ts
```

Script sẽ hỏi:

- **Course ID**: ID khóa học (phải trùng với Bước 1)
- **Lesson ID**: ID bài học (phải trùng với Game ID ở Bước 1)
- **Tiêu đề**: Tên bài học
- **Mô tả**: Mô tả ngắn
- **Thứ tự**: Vị trí trong khóa học (vd: 1, 2, 3...)
- **Thời lượng**: Ước tính phút (vd: 15)
- **Loại game**: string, list, dict, loop, etc.

Nếu course chưa tồn tại, script sẽ hỏi thêm để tạo course mới.

### Bước 4: Đăng Ký Game Module

Mở file `src/components/PlayGameContent.tsx` và thêm import + mapping:

```typescript
// Import game module
import initGame5 from "@/content/python-basics/chapter-1/t10-cd-b12/id5";

// Thêm vào gameModules
const gameModules: Record<string, GameInitFunction> = {
  "python-basics/chapter-1/t10-cd-b12/id1": initGame1,
  "python-basics/chapter-1/t10-cd-b12/id2": initGame2,
  "python-basics/chapter-1/t10-cd-b12/id5": initGame5, // Game mới
};
```

### Bước 5: Test Game

1. Khởi động server:

```bash
pnpm dev
```

2. Truy cập:

```
http://localhost:3001/lesson/{courseId}/{lessonId}
```

3. Kiểm tra:
   - UI hiển thị đúng
   - Code editor hoạt động
   - Test cases pass khi submit code đúng
   - Phaser game render OK
   - Âm thanh phát OK

---

## 📖 Template Có Sẵn

### Game Template

File: `src/content/_template/game-template.ts`

Template này bao gồm:

- ✅ Layout sẵn (game canvas + code editor)
- ✅ Phaser setup cơ bản
- ✅ Python code validation
- ✅ Test cases system
- ✅ Fullscreen code editor
- ✅ Output console
- ✅ Sound effects

Chỉ cần chỉnh sửa `GAME_CONFIG` là có thể dùng ngay!

---

## 🗄️ Cấu Trúc Database

### Courses Table

```sql
CREATE TABLE courses (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  level VARCHAR(50) DEFAULT 'beginner',
  total_lessons INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Lessons Table

```sql
CREATE TABLE lessons (
  id VARCHAR(100) NOT NULL,
  course_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  game_type VARCHAR(50),
  PRIMARY KEY (id, course_id)
);
```

### User Progress Table

```sql
CREATE TABLE user_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  lesson_id VARCHAR(100) NOT NULL,
  course_id VARCHAR(100) NOT NULL,
  completed_at TIMESTAMP,
  score INTEGER,
  attempts INTEGER
);
```

---

## 🔧 Công Cụ Scripts

### 1. Generate Game

```bash
npx tsx scripts/generate-game.ts
```

Tạo file game mới từ template.

### 2. Add Lesson

```bash
npx tsx scripts/add-lesson.ts
```

Thêm lesson vào database (và tạo course nếu cần).

### 3. Init Database

```bash
npx tsx database/init-full.ts
```

Khởi tạo toàn bộ database schema.

### 4. Test Database Connection

```bash
npx tsx database/test.ts
```

Kiểm tra kết nối database.

---

## 📝 Naming Convention

### Course ID

Format: `{subject}-{level}`

- Ví dụ: `python-basics`, `python-advanced`, `javascript-intro`

### Lesson/Game ID

Format: `t{topic}-cd-b{block}-id{number}`

- Ví dụ: `t10-cd-b12-id5`
- `t10` = topic 10
- `b12` = block 12
- `id5` = lesson số 5

---

## 🎨 Assets Guidelines

### Background Image

- Kích thước khuyến nghị: **720x520px**
- Format: PNG hoặc JPG
- Đặt tại: `public/{gameId}/bg.png`

### Sounds

- Format: MP3 hoặc OGG
- Sounds global: `public/sound_global/`
  - `correct.mp3` - Âm thanh đúng
  - `wrong.mp3` - Âm thanh sai

---

## 🧪 Test Cases Best Practices

### Nên có nhiều test cases đa dạng:

```typescript
testCases: [
  // Test case cơ bản
  { input: "hello", expected: "olleh", description: "Chuỗi thường" },

  // Test case edge case
  { input: "", expected: "", description: "Chuỗi rỗng" },
  { input: "a", expected: "a", description: "1 ký tự" },

  // Test case phức tạp
  {
    input: "Hello World!",
    expected: "!dlroW olleH",
    description: "Có khoảng trắng và ký tự đặc biệt",
  },

  // Test case số
  { input: "12345", expected: "54321", description: "Chuỗi số" },
];
```

---

## 🚨 Troubleshooting

### Game không hiển thị?

1. Kiểm tra đã import đúng trong `PlayGameContent.tsx`
2. Kiểm tra path mapping trong `gameModules`
3. Check console log lỗi

### Database connection failed?

1. Kiểm tra PostgreSQL đang chạy
2. Xác nhận credentials trong `src/lib/db.ts`
3. Chạy `npx tsx database/test.ts` để test

### Pyodide không load?

1. Kiểm tra CDN script trong `PlayGameContent.tsx`
2. Xem console có lỗi CORS không
3. Test internet connection

### Test cases không pass?

1. Kiểm tra tên hàm Python có đúng không
2. Xem output console để debug
3. Test code Python riêng lẻ

---

## 📚 Ví Dụ Hoàn Chỉnh

### Ví dụ: Tạo game "Tìm số lớn nhất"

#### 1. Generate game

```bash
npx tsx scripts/generate-game.ts
# Course ID: python-basics
# Game ID: t10-cd-b12-id5
# Tiêu đề: Tìm số lớn nhất
# Hàm Python: find_max
# Mô tả:
#   Viết hàm nhận vào list số và trả về số lớn nhất
#   - Input: list[int]
#   - Output: int
```

#### 2. Chỉnh sửa GAME_CONFIG

```typescript
const GAME_CONFIG = {
  title: "Tìm Số Lớn Nhất",
  description: `
    Viết hàm find_max() nhận vào một list số
    và trả về số lớn nhất trong list đó.
    
    Ví dụ: find_max([1, 5, 3]) → 5
  `,
  pythonFunction: "find_max",
  starterCode: `def find_max(numbers):
    # Viết code ở đây
    
    
    return max_num`,
  testCases: [
    { input: [1, 5, 3], expected: "5", description: "Test cơ bản" },
    { input: [-1, -5, -3], expected: "-1", description: "Số âm" },
    { input: [42], expected: "42", description: "1 phần tử" },
    { input: [1, 2, 3, 4, 5], expected: "5", description: "Tăng dần" },
  ],
  assets: {
    background: "/python-basics/chapter-1/t10-cd-b12/id5/bg.png",
    sounds: {
      correct: "/sound_global/correct.mp3",
      wrong: "/sound_global/wrong.mp3",
    },
  },
};
```

#### 3. Add vào database

```bash
npx tsx scripts/add-lesson.ts
# Lesson ID: t10-cd-b12-id5
# Tiêu đề: Tìm số lớn nhất trong list
# Thứ tự: 5
# Thời lượng: 20
# Game type: list
```

#### 4. Đăng ký trong PlayGameContent.tsx

```typescript
import initGame5 from "@/content/python-basics/chapter-1/t10-cd-b12/id5";

const gameModules: Record<string, GameInitFunction> = {
  // ...existing games
  "python-basics/chapter-1/t10-cd-b12/id5": initGame5,
};
```

✅ Done! Game sẵn sàng tại `/lesson/1/1/5` (course/topic/lesson)

---

## 🎓 Tips & Best Practices

1. **Test cases đầy đủ**: Luôn có ít nhất 4-5 test cases bao gồm edge cases
2. **Starter code rõ ràng**: Để hints trong comments cho học sinh
3. **Mô tả chi tiết**: Giải thích rõ input/output và ví dụ
4. **Assets tối ưu**: Compress images để load nhanh
5. **Error handling**: Phaser game nên có fallback khi assets không load
6. **Phaser clean up**: Destroy game instance khi unmount

---

## 📞 Support

Nếu gặp vấn đề, check:

1. README.md chính
2. Console logs (browser + terminal)
3. Database logs
4. File paths có đúng không

Happy coding! 🚀
