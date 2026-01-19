# 🎮 HƯỚNG DẪN TẠO GAME - 2 KIỂU MỚI

## 📋 Tổng quan

Hệ thống hiện hỗ trợ **3 loại game template**:

### 1️⃣ **Type 1: Multi-Scene Function Testing**

- Gọi hàm Python **nhiều lần** với các input khác nhau
- Mỗi test case = 1 scene trong game
- Game tự động chuyển scene khi pass test
- Phù hợp: Bài tập viết hàm xử lý dữ liệu

### 2️⃣ **Type 2: CodeRunner Style**

- Sử dụng `input()` và `print()` như Moodle
- So sánh output của học sinh vs expected output
- Mỗi bộ input/output = 1 scene
- Phù hợp: Bài tập đọc input và xử lý

### 3️⃣ **Legacy: Single Test** (template cũ)

- Chỉ 1 test case duy nhất
- Đơn giản nhưng ít tính giáo dục

---

## 🚀 WORKFLOW TẠO GAME

### Bước 1: Generate game từ template

```bash
npx tsx scripts/generate-game.ts
```

**Chọn loại game:**

- `1` → Type 1 (Multi-Scene Function)
- `2` → Type 2 (CodeRunner)
- `3` → Legacy

**Điền thông tin:**

- Course ID: `python-basics`
- Game ID: `t10-cd-b12-id5`
- Tiêu đề: `Đảo ngược chuỗi`
- Tên hàm (Type 1): `reverse_string` (bỏ qua nếu Type 2)
- Mô tả: nhập nhiều dòng, Enter 2 lần để kết thúc

### Bước 2: Thêm background images

```
public/
  t10-cd-b12-id5/
    scene1.png  ← 720x520px
    scene2.png
    scene3.png
```

### Bước 3: Chỉnh sửa GAME_CONFIG

Mở `src/content/python-basics/chapter-1/t10-cd-b12/id5/index.ts`

#### **Type 1 Example:**

```typescript
const GAME_CONFIG = {
  title: "Đảo ngược chuỗi",
  description: `Viết hàm reverse_string() để đảo ngược chuỗi`,

  pythonFunction: "reverse_string",

  starterCode: `def reverse_string(text):
    # Code của bạn
    return result`,

  // 3 test cases = 3 scenes
  testCases: [
    {
      input: "hello",
      expected: "olleh",
      description: "Scene 1: Basic",
      sceneText: "🎮 Level 1",
    },
    {
      input: "Python",
      expected: "nohtyP",
      description: "Scene 2: Medium",
      sceneText: "🎮 Level 2",
    },
    {
      input: "12345",
      expected: "54321",
      description: "Scene 3: Advanced",
      sceneText: "🎮 Level 3",
    },
  ],

  sceneAssets: [
    { background: "/python-basics/chapter-1/t10-cd-b12/id5/scene1.png" },
    { background: "/python-basics/chapter-1/t10-cd-b12/id5/scene2.png" },
    { background: "/python-basics/chapter-1/t10-cd-b12/id5/scene3.png" },
  ],
};
```

#### **Type 2 Example:**

```typescript
const GAME_CONFIG = {
  title: "Cộng hai số",
  description: `Đọc 2 số và in tổng. Sử dụng input() và print()`,

  starterCode: `a = int(input())
b = int(input())
total = a + b
print(total)`,

  // Input dùng \n để ngăn cách các dòng
  testCases: [
    {
      input: "5\n10", // 2 dòng input
      expected: "15", // Expected output
      description: "Scene 1: Số nhỏ",
      sceneText: "🎮 Level 1",
    },
    {
      input: "100\n200",
      expected: "300",
      description: "Scene 2: Số lớn",
      sceneText: "🎮 Level 2",
    },
  ],

  sceneAssets: [
    { background: "/python-basics/chapter-1/t10-cd-b12/id5/scene1.png" },
    { background: "/python-basics/chapter-1/t10-cd-b12/id5/scene2.png" },
  ],
};
```

### Bước 4: Thêm game vào database

```bash
npx tsx scripts/add-game.ts
```

Điền:

- Course ID: `1` (hoặc ID khác)
- Lesson ID: `1` (chọn từ danh sách)
- Game title: `Đảo ngược chuỗi`
- Description: `Viết hàm đảo ngược...`
- Game type: `coding`
- Path: `t10-cd-b12-id5`
- Order: `1`

### Bước 5: Test game

1. Restart server: `pnpm dev`
2. Mở: `http://localhost:3000`
3. Vào Course → Topic → Lesson → Chơi game

---

## 🎯 CƠ CHẾ HOẠT ĐỘNG

### Type 1: Multi-Scene Function Testing

```
Student clicks Submit
  ↓
1. Pyodide runs student code
2. Extract function: my_function()
3. Loop scenes:
   - Call: result = my_function(testCase.input)
   - Compare: result === testCase.expected
   - Show: ✓ PASS or ✗ FAIL in Phaser
   - Wait 1.5s → Load next scene
4. After last scene → Show test case table
```

**Test Cases:**

- **Mỗi test case = 1 scene riêng biệt**
- Hàm được gọi lại cho mỗi scene
- Kết quả được ghi vào `testResults[]`

### Type 2: CodeRunner Style

```
Student clicks Submit
  ↓
1. Loop scenes:
   - Setup stdin: pyodide.setStdin() with input lines
   - Capture stdout: pyodide.setStdout()
   - Run: pyodide.runPython(studentCode)
   - Get output from stdout
   - Compare: actualOutput === expectedOutput
   - Show: ✓ PASS or ✗ FAIL in Phaser
   - Wait 1.5s → Next scene
2. After last scene → Show test case table
```

**Input/Output:**

- Input: `"5\n10"` → 2 dòng (5 và 10)
- Code gọi `input()` 2 lần
- Code `print()` kết quả
- System so sánh output với expected

---

## 📊 TEST CASE TABLE

Bảng testcase **chỉ hiện sau scene cuối**:

| Scene   | Input  | Expected | Your Output | Result |
| ------- | ------ | -------- | ----------- | ------ |
| Scene 1 | hello  | olleh    | olleh       | ✓ Pass |
| Scene 2 | Python | nohtyP   | nohtyP      | ✓ Pass |
| Scene 3 | 12345  | 54321    | 12345       | ✗ Fail |

**CSS class:** `.testcase-table.visible`

---

## 🎨 GAME UI FEATURES

✅ **Multi-scene progression** - Tự động chuyển scene  
✅ **Scene counter** - "Scene 1/3"  
✅ **Visual feedback** - ✓ PASS (green) / ✗ FAIL (red)  
✅ **Sound effects** - correct.mp3 / wrong.mp3  
✅ **Test case table** - Hiện sau scene cuối  
✅ **Code editor** - Fullscreen mode (Phóng to)  
✅ **Output console** - Realtime logs

---

## 📝 VÍ DỤ CÓ SẴN

### Type 1: String Reversal

```bash
src/content/python-basics/example-type1-reverse/index.ts
```

### Type 2: Add Numbers

```bash
src/content/python-basics/example-type2-add/index.ts
```

Copy và modify để tạo game nhanh!

---

## ⚙️ GAME_CONFIG CHI TIẾT

### Common Fields

```typescript
{
  title: string,              // Tiêu đề hiển thị
  description: string,        // Mô tả bài tập (hỗ trợ \n)

  testCases: [
    {
      input: string,          // Input cho test
      expected: string,       // Kết quả mong đợi
      description: string,    // Mô tả test case
      sceneText: string,      // Text hiển thị trong scene
    }
  ],

  sceneAssets: [              // Background cho từng scene
    { background: string }
  ],

  phaser: {
    width: 720,
    height: 520,
    backgroundColor: string,
  }
}
```

### Type 1 Specific

```typescript
{
  pythonFunction: string,     // Tên hàm cần viết
  starterCode: string,        // Template code với def
}
```

### Type 2 Specific

```typescript
{
  starterCode: string,        // Template với input() và print()
  // Input format: "line1\nline2\nline3"
}
```

---

## 🔧 TROUBLESHOOTING

### Game không load?

- Kiểm tra `import * as Phaser from "phaser"` (NOT default import)
- Check console errors

### Test cases không chạy?

- **Type 1:** Kiểm tra tên hàm trùng với `pythonFunction`
- **Type 2:** Đảm bảo code có `print()` output

### Scene không chuyển?

- Mỗi scene cần 1.5s để chuyển
- Kiểm tra testCases.length === sceneAssets.length

### Test case table không hiện?

- Chỉ hiện sau **scene cuối cùng**
- Check class `.testcase-table.visible`

---

## 📚 SUMMARY

| Feature         | Type 1 | Type 2 | Legacy |
| --------------- | ------ | ------ | ------ |
| Multi-scene     | ✅     | ✅     | ❌     |
| Function call   | ✅     | ❌     | ✅     |
| input()/print() | ❌     | ✅     | ❌     |
| Test table      | ✅     | ✅     | ❌     |
| Auto progress   | ✅     | ✅     | ❌     |

**Khuyến nghị:**

- Bài viết hàm → **Type 1**
- Bài đọc/ghi I/O → **Type 2**
- Avoid legacy

---

## 🎓 NEXT STEPS

1. ✅ Tạo game với `npx tsx scripts/generate-game.ts`
2. ✅ Thêm 3 scene images (720x520px)
3. ✅ Edit GAME_CONFIG (5 phút)
4. ✅ Add to database: `npx tsx scripts/add-game.ts`
5. ✅ Test và deploy!

🎮 **Happy Game Creating!**
