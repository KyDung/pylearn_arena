# 🚀 QUICK START - Thêm Bài Học Mới

## 3 Bước Đơn Giản

### 1️⃣ Tạo Game

```bash
npx tsx scripts/generate-game.ts
```

Nhập thông tin khi được hỏi.

### 2️⃣ Thêm vào Database

```bash
npx tsx scripts/add-lesson.ts
```

Nhập thông tin lesson.

### 3️⃣ Đăng ký Game Module

Mở `src/components/PlayGameContent.tsx`:

```typescript
// Thêm import
import initGameMoi from "@/content/{courseId}/{gameId}";

// Thêm vào gameModules
const gameModules = {
  // ...existing
  "{courseId}/{gameId}": initGameMoi,
};
```

## ✅ Done!

Test tại: `http://localhost:3001/lesson/{courseId}/{lessonId}`

---

📖 **Hướng dẫn chi tiết**: Xem file [ADDING_CONTENT.md](./ADDING_CONTENT.md)
