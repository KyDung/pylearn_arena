# 📚 PYLEARN ARENA - GAME SYSTEM DOCUMENTATION

## 🎯 TÓM TẮT HỆ THỐNG

PyLearn Arena hiện có **3 loại game template** với cơ chế testing khác nhau:

| Type       | Mechanism                      | Use Case         | Difficulty |
| ---------- | ------------------------------ | ---------------- | ---------- |
| **Type 1** | Multi-Scene Function Testing   | Bài tập viết hàm | ⭐⭐⭐     |
| **Type 2** | CodeRunner Style (input/print) | Bài tập I/O      | ⭐⭐       |
| **Legacy** | Single Test                    | Game đơn giản    | ⭐         |

---

## 📖 TÀI LIỆU

### 1. [GAME_TYPES_GUIDE.md](./GAME_TYPES_GUIDE.md) 📘

**Hướng dẫn chi tiết về 2 loại game mới**

Nội dung:

- ✅ Cơ chế hoạt động Type 1 & Type 2
- ✅ GAME_CONFIG đầy đủ với giải thích
- ✅ Test case table mechanism
- ✅ Multi-scene progression logic
- ✅ Troubleshooting guide
- ✅ So sánh 3 loại game

**Đọc khi:** Muốn hiểu sâu về cơ chế

### 2. [QUICK_START_TYPE1_TYPE2.md](./QUICK_START_TYPE1_TYPE2.md) 🚀

**Hướng dẫn nhanh tạo game**

Nội dung:

- ✅ Workflow 5 bước (Generate → Images → Config → Database → Test)
- ✅ Ví dụ cụ thể cho Type 1 & Type 2
- ✅ Command line examples
- ✅ Debug tips
- ✅ Checklist

**Đọc khi:** Muốn tạo game ngay

### 3. [QUICK_START_NEW.md](./QUICK_START_NEW.md) 🏗️

**Hướng dẫn thêm Course, Topic, Lesson**

Nội dung:

- ✅ add-topic.ts usage
- ✅ add-lesson-new.ts usage
- ✅ add-game.ts usage
- ✅ Database structure
- ✅ Full workflow example

**Đọc khi:** Muốn tạo khóa học mới

---

## 🎮 CÁC LOẠI GAME

### Type 1: Multi-Scene Function Testing

**Đặc điểm:**

- Học sinh viết **hàm Python**
- Hàm được **gọi nhiều lần** với input khác nhau
- Mỗi test case = 1 scene riêng
- Game tự động chuyển scene khi pass

**Ví dụ:**

```python
def reverse_string(text):
    return text[::-1]
```

**Test cases:**

- Scene 1: `reverse_string("hello")` → "olleh"
- Scene 2: `reverse_string("Python")` → "nohtyP"
- Scene 3: `reverse_string("12345")` → "54321"

**Phù hợp:** Bài tập thuật toán, xử lý dữ liệu

### Type 2: CodeRunner Style

**Đặc điểm:**

- Học sinh viết **code với input()/print()**
- So sánh **stdout** vs expected output
- Giống Moodle CodeRunner
- Multi-input với `\n` separator

**Ví dụ:**

```python
a = int(input())
b = int(input())
print(a + b)
```

**Test cases:**

- Scene 1: input `5\n10` → output "15"
- Scene 2: input `100\n200` → output "300"

**Phù hợp:** Bài tập đọc/ghi file, console I/O

### Legacy: Single Test

**Đặc điểm:**

- Chỉ 1 test case
- Không có multi-scene
- Template cũ

**Không khuyến khích dùng**

---

## 📁 CẤU TRÚC FILES

```
pylearn_arena/
├── src/
│   ├── content/
│   │   ├── _template/
│   │   │   ├── game-template.ts          ← Legacy
│   │   │   ├── game-template-type1.ts    ← Type 1 ⭐
│   │   │   └── game-template-type2.ts    ← Type 2 ⭐
│   │   └── python-basics/
│   │       ├── example-type1-reverse/    ← Ví dụ Type 1
│   │       ├── example-type2-add/        ← Ví dụ Type 2
│   │       ├── t10-cd-b12-id1/           ← Game hiện tại
│   │       └── ...
│   └── app/
│       └── play/page.tsx                 ← Game player
├── scripts/
│   ├── generate-game.ts                  ← Tạo game từ template
│   ├── add-topic.ts                      ← Thêm topic
│   ├── add-lesson-new.ts                 ← Thêm lesson
│   └── add-game.ts                       ← Thêm game vào DB
├── public/
│   ├── example-type1-reverse/
│   │   ├── scene1.png
│   │   ├── scene2.png
│   │   └── scene3.png
│   └── example-type2-add/
│       └── ...
├── GAME_TYPES_GUIDE.md                   ← Hướng dẫn chi tiết
├── QUICK_START_TYPE1_TYPE2.md            ← Quick start
└── QUICK_START_NEW.md                    ← Database setup
```

---

## 🚀 WORKFLOW TẠO GAME ĐẦY ĐỦ

### 1. Tạo Structure (1 lần duy nhất)

```bash
# Thêm topic
npx tsx scripts/add-topic.ts
# → Course ID: 1
# → Title: "Chủ đề F: Xử lý chuỗi"

# Thêm lesson
npx tsx scripts/add-lesson-new.ts
# → Topic ID: 1
# → Title: "Bài 12: String methods"
```

### 2. Generate Game Template

```bash
# Type 1
npx tsx scripts/generate-game.ts
# → Chọn: 1
# → Game ID: string-methods
# → Function: process_string

# Type 2
npx tsx scripts/generate-game.ts
# → Chọn: 2
# → Game ID: io-practice
```

### 3. Customize Game

```typescript
// Edit: src/content/python-basics/string-methods/index.ts

const GAME_CONFIG = {
  title: "Your Title",
  description: `Your description`,

  // Type 1 only:
  pythonFunction: "function_name",

  starterCode: `...`,

  testCases: [
    { input: "...", expected: "...", description: "...", sceneText: "..." },
    // Add 2-5 test cases
  ],

  sceneAssets: [
    { background: "/game-id/scene1.png" },
    // Match number of test cases
  ],
};
```

### 4. Add Assets

```bash
# Add scene images (720x520px)
public/string-methods/
  scene1.png
  scene2.png
  scene3.png
```

### 5. Add to Database

```bash
npx tsx scripts/add-game.ts
# → Lesson ID: 1
# → Title: "String methods"
# → Path: string-methods
```

### 6. Test

```bash
pnpm dev
# Open: http://localhost:3000
```

---

## 🎓 VÍ DỤ CÓ SẴN

### 1. Type 1 - String Reversal

📂 `src/content/python-basics/example-type1-reverse/`

**Features:**

- 3 test cases (hello, Python, 12345)
- Function: `reverse_string(text)`
- Multi-scene progression

**Use as:** Template cho bài tập hàm

### 2. Type 2 - Add Numbers

📂 `src/content/python-basics/example-type2-add/`

**Features:**

- 3 test cases (small, large, negative numbers)
- input()/print() style
- Multi-input handling

**Use as:** Template cho bài tập I/O

### 3. Production Games (2 games hiện tại)

📂 `src/content/python-basics/chapter-1/t10-cd-b12/id[1-2]/`

**Features:**

- Multi-scene with single test per scene
- Current production games
- Hierarchical folder structure

**Use as:** Reference for existing games

---

## 🔧 SCRIPTS

| Script              | Purpose                | Usage                               |
| ------------------- | ---------------------- | ----------------------------------- |
| `generate-game.ts`  | Tạo game từ template   | `npx tsx scripts/generate-game.ts`  |
| `add-topic.ts`      | Thêm topic mới         | `npx tsx scripts/add-topic.ts`      |
| `add-lesson-new.ts` | Thêm lesson vào topic  | `npx tsx scripts/add-lesson-new.ts` |
| `add-game.ts`       | Thêm game vào database | `npx tsx scripts/add-game.ts`       |

**Thứ tự:** topic → lesson → generate-game → add-game

---

## 🎯 CHỌN LOẠI GAME

### Type 1 khi:

- ✅ Bài tập viết **hàm** (def function)
- ✅ Có nhiều test cases với **input/output đơn giản**
- ✅ Muốn test **logic thuật toán**
- ✅ Không cần đọc từ console

**Ví dụ:** String manipulation, math functions, list processing

### Type 2 khi:

- ✅ Bài tập **đọc input()** và **print() output**
- ✅ Có nhiều dòng input
- ✅ Muốn giống **CodeRunner trên Moodle**
- ✅ Học sinh cần practice I/O

**Ví dụ:** Console programs, file I/O simulation, multi-line input

### Legacy khi:

- ⚠️ Chỉ cần **1 test case đơn giản**
- ⚠️ Không cần multi-scene
- ⚠️ Game prototype nhanh

**Khuyến nghị:** Dùng Type 1 hoặc Type 2

---

## 📊 SO SÁNH

| Feature            | Type 1 | Type 2 | Legacy |
| ------------------ | ------ | ------ | ------ |
| Multi-scene        | ✅ Yes | ✅ Yes | ❌ No  |
| Test case table    | ✅ Yes | ✅ Yes | ❌ No  |
| Function testing   | ✅ Yes | ❌ No  | ✅ Yes |
| Input/Output style | ❌ No  | ✅ Yes | ❌ No  |
| Auto progression   | ✅ Yes | ✅ Yes | ❌ No  |
| Sound effects      | ✅ Yes | ✅ Yes | ✅ Yes |
| Scene counter      | ✅ Yes | ✅ Yes | ❌ No  |
| Learning value     | ⭐⭐⭐ | ⭐⭐⭐ | ⭐     |

---

## 💡 BEST PRACTICES

### Test Cases

- Thêm **3-5 test cases** cho mỗi game
- Từ **dễ → khó** (basic → edge cases)
- Mỗi test case có **description rõ ràng**
- Scene text có **emoji** cho dễ nhìn

### Background Images

- Size: **720x520px**
- Format: PNG/JPG
- Tên file: `scene1.png`, `scene2.png`, ...
- Số lượng: **khớp với test cases**

### Starter Code

- Có **comment hướng dẫn**
- Có **structure cơ bản**
- Học sinh chỉ cần **fill in the blanks**
- Test được với starter code (trả về placeholder)

### Description

- **Giải thích rõ yêu cầu**
- Có **ví dụ input/output**
- **Format đẹp** với bullet points
- Hướng dẫn **cách sử dụng input()/print()** (Type 2)

---

## 🐛 TROUBLESHOOTING

### Game không load

```bash
# Check Phaser import
import * as Phaser from "phaser";  # ✅ Correct
import Phaser from "phaser";       # ❌ Wrong
```

### Test cases không chạy

```typescript
// Type 1: Check function name
pythonFunction: "my_function",  // Must match
starterCode: `def my_function(...)`  // Function name

// Type 2: Check print() exists
starterCode: `
result = ...
print(result)  # Must have print!
`
```

### Scene không chuyển

```typescript
// Check: testCases.length === sceneAssets.length
testCases: [/* 3 items */],
sceneAssets: [/* 3 items */],  // Must match!
```

### Test case table không hiện

- Chỉ hiện **sau scene cuối cùng**
- Check CSS class: `.testcase-table.visible`
- Verify trong console: `document.querySelector('.testcase-table')`

---

## 📞 SUPPORT

### Issues

- Check console errors (F12)
- Verify file paths
- Test with example games first

### Database

- Verify MySQL running: `mysql -u root -p pylearn_arena`
- Check tables: `SELECT * FROM games;`

### Assets

- Verify images exist: `public/game-id/scene1.png`
- Check browser Network tab for 404s

---

## 🎉 SUMMARY

1. **3 loại game:** Type 1 (Function), Type 2 (I/O), Legacy
2. **Multi-scene:** Mỗi test case = 1 scene
3. **Test table:** Hiện sau game hoàn thành
4. **Scripts:** generate-game → add-game
5. **Examples:** example-type1-reverse, example-type2-add

**Bắt đầu:** [QUICK_START_TYPE1_TYPE2.md](./QUICK_START_TYPE1_TYPE2.md)

---

Made with ❤️ for PyLearn Arena
