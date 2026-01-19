# 🚀 HƯỚNG DẪN NHANH - Thêm Nội Dung

## Quy trình thêm nội dung mới

### 1️⃣ Thêm Chủ đề (Topic)

```bash
npx tsx scripts/add-topic.ts
```

**Ví dụ:**

- Course ID: `python-basics`
- Tên: `Chủ đề G: Làm việc với danh sách`
- Mô tả: `Học cách sử dụng list trong Python`
- Thứ tự: `2`

→ Sẽ nhận được **Topic ID** (vd: `2`) để dùng cho bước tiếp theo

---

### 2️⃣ Thêm Bài học (Lesson)

```bash
npx tsx scripts/add-lesson-new.ts
```

**Ví dụ:**

- Topic ID: `2` (từ bước 1)
- Lesson ID: `bai-13`
- Tên: `Bài 13: Danh sách trong Python`
- Mô tả: `Học cách tạo và thao tác với list`
- Thứ tự: `1`
- Thời lượng: `45` phút

→ Sẽ nhận được **Lesson ID** để dùng cho bước tiếp theo

---

### 3️⃣ Tạo Game từ Template

```bash
npx tsx scripts/generate-game.ts
```

**Nhập thông tin:**

- Course ID: `python-basics`
- Game ID: `t10-cd-b13-id1`
- Tiêu đề: `Tạo danh sách`
- Hàm Python: `create_list`
- Mô tả: (nhập nhiều dòng, Enter 2 lần để kết thúc)

→ File game được tạo tại: `src/content/python-basics/t10-cd-b13-id1/index.ts`

---

### 4️⃣ Thêm Game vào Database

```bash
npx tsx scripts/add-game.ts
```

**Ví dụ:**

- Course ID: `python-basics`
- Lesson ID: `bai-13`
- Game ID: `t10-cd-b13-id1`
- Tên: `Game 1: Tạo danh sách`
- Mô tả: `Viết hàm tạo list từ các phần tử`
- Thứ tự: `1`
- Loại: `list`
- Path: `t10-cd-b13-id1`

---

### 5️⃣ Chỉnh sửa Game Code

Mở file: `src/content/python-basics/t10-cd-b13-id1/index.ts`

**Chỉnh sửa GAME_CONFIG:**

```typescript
const GAME_CONFIG = {
  title: "Tạo danh sách",
  description: `
    Viết hàm create_list() nhận vào các số
    và trả về một list chứa các số đó.
    
    Ví dụ: create_list(1, 2, 3) → [1, 2, 3]
  `,
  pythonFunction: "create_list",
  starterCode: `def create_list(*args):
    # Viết code ở đây
    
    
    return result`,
  testCases: [
    { input: [1, 2, 3], expected: "[1, 2, 3]", description: "List số" },
    { input: [], expected: "[]", description: "List rỗng" },
  ],
  assets: {
    background: "/t10-cd-b13-id1/bg.png",
    sounds: {
      correct: "/sound_global/correct.mp3",
      wrong: "/sound_global/wrong.mp3",
    },
  },
};
```

---

### 6️⃣ Thêm Assets

1. Đặt background image tại: `public/python-basics/chapter-1/t10-cd-b13/id1/bg.png`
2. Sounds đã có sẵn trong `public/sound_global/`

---

## ✅ Checklist hoàn chỉnh

- [ ] Chạy `npx tsx scripts/add-topic.ts` → Có Topic ID
- [ ] Chạy `npx tsx scripts/add-lesson-new.ts` → Có Lesson ID
- [ ] Chạy `npx tsx scripts/generate-game.ts` → File game được tạo
- [ ] Chạy `npx tsx scripts/add-game.ts` → Game trong database
- [ ] Chỉnh sửa `GAME_CONFIG` trong file game
- [ ] Thêm background image vào `public/{gameId}/bg.png`
- [ ] Test game tại: `http://localhost:3000/course/{courseId}`

---

## 🎯 Ví dụ đầy đủ

**Tạo chủ đề mới với 1 bài học và 2 games:**

```bash
# Bước 1: Tạo topic
npx tsx scripts/add-topic.ts
# → Topic ID: 2

# Bước 2: Tạo lesson
npx tsx scripts/add-lesson-new.ts
# → Lesson ID: bai-13

# Bước 3-4: Tạo game 1
npx tsx scripts/generate-game.ts  # → File created
npx tsx scripts/add-game.ts       # → Game in DB

# Bước 3-4: Tạo game 2
npx tsx scripts/generate-game.ts  # → File created
npx tsx scripts/add-game.ts       # → Game in DB

# Bước 5: Chỉnh sửa code game
# Edit: src/content/python-basics/chapter-1/t10-cd-b13/id1/index.ts
# Edit: src/content/python-basics/chapter-1/t10-cd-b13/id2/index.ts

# Bước 6: Thêm assets
# Add: public/python-basics/chapter-1/t10-cd-b13/id1/bg.png
# Add: public/python-basics/chapter-1/t10-cd-b13/id2/bg.png
```

---

## 📝 Naming Convention

### Topic

- Format: `Chủ đề {Letter}: {Mô tả}`
- Ví dụ: `Chủ đề F: Giải quyết vấn đề...`

### Lesson

- ID: `bai-{số}`
- Ví dụ: `bai-12`, `bai-13`
- Tên: `Bài {số}: {Tiêu đề}`

### Game

- ID: `t{topic}-cd-b{lesson}-id{game_number}`
- Ví dụ: `t10-cd-b12-id1`, `t10-cd-b12-id2`
- Path: Thường giống Game ID

---

## 🔧 Commands tham khảo

```bash
# Xem topics hiện có
npx tsx -e "import pool from './src/lib/db.js'; pool.query('SELECT * FROM topics').then(r => { console.table(r.rows); pool.end(); });"

# Xem lessons hiện có
npx tsx -e "import pool from './src/lib/db.js'; pool.query('SELECT l.id, l.title, t.title as topic FROM lessons l JOIN topics t ON l.topic_id = t.id').then(r => { console.table(r.rows); pool.end(); });"

# Xem games hiện có
npx tsx -e "import pool from './src/lib/db.js'; pool.query('SELECT id, title, lesson_id, path FROM games ORDER BY lesson_id, order_index').then(r => { console.table(r.rows); pool.end(); });"
```

---

## 🚨 Lưu ý quan trọng

1. **Thứ tự quan trọng**: Topic → Lesson → Game (theo đúng hierarchy)
2. **IDs phải unique**: Game ID không được trùng
3. **Path mapping**: Sau khi tạo game, cần map trong PlayGameContent nếu cần
4. **Test cases đầy đủ**: Luôn có ít nhất 3-4 test cases
5. **Assets**: Background nên có kích thước 720x520px

---

📖 **Xem hướng dẫn chi tiết:** [ADDING_CONTENT.md](./ADDING_CONTENT.md)
