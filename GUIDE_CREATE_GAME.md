# 🎮 Hướng dẫn tạo Game mới với Dev Content Manager

## 📋 Tổng quan

Khi tạo game mới, hệ thống sẽ **tự động copy template đầy đủ** (~600 dòng code) với:

- ✅ Giao diện game hoàn chỉnh (Phaser + Code Editor)
- ✅ Xử lý Pyodide (chạy Python trong browser)
- ✅ Test case table tự động
- ✅ Multi-scene progression
- ✅ Contest integration
- ✅ Timeout protection

Bạn chỉ cần **code logic game** và **điền test cases**!

---

## 🚀 Các bước tạo game mới

### 1. Vào Dev Content Manager

- Đăng nhập với tài khoản admin
- Vào: `http://localhost:3000/dev/content-manager`

### 2. Chọn tab "Add Game"

- **Select Course**: Chọn khóa học (vd: `python-basics`)
- **Select Topic**: Chọn chương (vd: `chapter-1`)
- **Select Lesson**: Chọn bài học (vd: `t10-cd-b12`)

### 3. Điền thông tin game

- **Slug**: ID của game (vd: `id5`, `id6`, `bai-tap-1`)
  - Chỉ dùng chữ thường, số, dấu gạch ngang
  - Sẽ tạo đường dẫn: `public/python-basics/chapter-1/t10-cd-b12/id5/`
- **Title**: Tên game hiển thị (vd: `Bài tập 1: Đảo ngược chuỗi`)

- **Description**: Mô tả game (optional)

- **Game Type**: Chọn loại game
  - **Type 1 - Function Testing**: Học sinh viết hàm, hệ thống gọi hàm kiểm tra
  - **Type 2 - CodeRunner**: Học sinh dùng `input()`/`print()`, giống CodeRunner

- **Order**: Thứ tự hiển thị (1, 2, 3...)

### 4. Click "Create Game + Files"

Hệ thống sẽ tự động:

- ✅ Tạo record trong database
- ✅ Tạo folder: `public/[course]/[topic]/[lesson]/[slug]/`
- ✅ Tạo folder: `src/content/[course]/[topic]/[lesson]/[slug]/`
- ✅ Copy template đầy đủ vào `src/content/.../index.ts`
- ✅ Thay thế `GAME_PATH`, `title`, `description`

---

## 📝 Sau khi tạo xong - Cần làm gì?

### Bước 1: Mở file game vừa tạo

File sẽ ở: `src/content/[course]/[topic]/[lesson]/[slug]/index.ts`

### Bước 2: Cấu hình GAME_CONFIG

#### 2.1. Thay đổi Test Cases

```typescript
testCases: [
  {
    input: "hello",           // Input cho test case
    expected: "HELLO",        // Kết quả mong đợi
    description: "Scene 1: Convert to uppercase",
    sceneText: "Level 1",
  },
  {
    input: "world",
    expected: "WORLD",
    description: "Scene 2: Another test",
    sceneText: "Level 2",
  },
  // Thêm test cases khác...
],
```

#### 2.2. Thay đổi Starter Code

**Với Type 1 (Function Testing):**

```typescript
pythonFunction: "my_function",  // Tên hàm học sinh cần viết

starterCode: `def my_function(input_value):
    # Học sinh code ở đây
    result = input_value.upper()
    return result`,
```

**Với Type 2 (CodeRunner - input/output):**

```typescript
starterCode: `# Đọc input
text = input()

# Xử lý
result = text.upper()

# Print kết quả
print(result)`,
```

#### 2.3. Thêm Assets (optional)

Nếu có hình ảnh background:

```typescript
sceneAssets: [
  { background: "/python-basics/chapter-1/t10-cd-b12/id5/scene1.png" },
  { background: "/python-basics/chapter-1/t10-cd-b12/id5/scene2.png" },
],
```

Upload ảnh vào folder `public/[course]/[topic]/[lesson]/[slug]/`

### Bước 3: Code logic game trong scene

Tìm hàm `runCodeForScene(sceneIndex)` trong template:

```typescript
async runCodeForScene(sceneIndex) {
  const testCase = GAME_CONFIG.testCases[sceneIndex];

  // testCase.input = input của test case hiện tại
  // testCase.expected = kết quả mong đợi

  // Code logic game của bạn ở đây
  // Ví dụ:
  if (userOutput === testCase.expected) {
    // Pass: Hiển thị nhân vật thắng
    this.showSuccess();
  } else {
    // Fail: Hiển thị lỗi
    this.showError(userOutput, testCase.expected);
  }
}
```

---

## 🎯 Ví dụ hoàn chỉnh

### Ví dụ 1: Type 1 - Function Testing (Đảo ngược chuỗi)

```typescript
const GAME_CONFIG = {
  title: "Đảo ngược chuỗi",
  description: "Viết hàm đảo ngược chuỗi Python",

  pythonFunction: "reverse_string",

  starterCode: `def reverse_string(text):
    # Viết code đảo ngược chuỗi
    return text[::-1]`,

  testCases: [
    {
      input: "hello",
      expected: "olleh",
      description: "Đảo ngược 'hello'",
      sceneText: "Level 1",
    },
    {
      input: "python",
      expected: "nohtyp",
      description: "Đảo ngược 'python'",
      sceneText: "Level 2",
    },
  ],
};
```

### Ví dụ 2: Type 2 - CodeRunner (Tính tổng)

```typescript
const GAME_CONFIG = {
  title: "Tính tổng 2 số",
  description: "Đọc 2 số và in ra tổng",

  starterCode: `# Đọc input
a = int(input())
b = int(input())

# Tính tổng
total = a + b

# In kết quả
print(total)`,

  testCases: [
    {
      input: "5\\n10", // 5 và 10 (xuống dòng)
      expected: "15",
      description: "5 + 10 = 15",
      sceneText: "Level 1",
    },
    {
      input: "100\\n200",
      expected: "300",
      description: "100 + 200 = 300",
      sceneText: "Level 2",
    },
  ],
};
```

---

## 🔍 Các biến quan trọng có sẵn trong template

Trong template, bạn có thể sử dụng:

```typescript
// Config
GAME_CONFIG.testCases; // Array test cases
GAME_CONFIG.testCases[i].input; // Input của test case thứ i
GAME_CONFIG.testCases[i].expected; // Expected output

// Game state
this.currentScene; // Scene hiện tại (0, 1, 2...)
this.gameState; // "playing", "success", "failed"

// Results
this.lastOutput; // Output từ code học sinh
this.lastExpected; // Expected output của test case
this.lastMatch; // true/false - code có đúng không

// UI Elements
this.codeEditor; // Code editor instance
this.outputPanel; // DOM element output panel
this.testCaseTable; // DOM element test case table
```

---

## 🎨 Tùy chỉnh giao diện game

### Thay đổi kích thước canvas

```typescript
phaser: {
  width: 720,      // Thay đổi width
  height: 520,     // Thay đổi height
  backgroundColor: "#121425",
},
```

### Thay đổi màu sắc

Trong `buildLayout()`:

```typescript
.game-card { background: white; }          // Màu nền card
.phaser-frame { background: #121425; }     // Màu nền game
.next-scene-btn { background: linear-gradient(...); }  // Nút next
```

---

## ⚠️ Lưu ý quan trọng

1. **GAME_PATH**: Đã được tự động điền, không cần sửa
2. **Template đầy đủ**: File được tạo đã có ~600 dòng code
3. **Chỉ cần sửa**:
   - `GAME_CONFIG` (test cases, starter code, title, description)
   - Logic game trong `runCodeForScene()` (nếu cần custom)
4. **Không xóa** các hàm có sẵn như:
   - `buildLayout()`
   - `initPyodide()`
   - `runPythonCode()`
   - `updateTestCaseTable()`

---

## 🐛 Debug

### Game không hiển thị?

- Kiểm tra console (F12) xem có lỗi không
- Đảm bảo `GAME_PATH` đúng với đường dẫn file

### Code Python không chạy?

- Kiểm tra Pyodide đã load chưa (console: "Pyodide loaded")
- Kiểm tra syntax Python (thử run code trong Python trước)

### Test case không pass?

- Console log `userOutput` và `testCase.expected` để so sánh
- Kiểm tra whitespace, newline trong output

---

## 📚 Tham khảo

Xem các game mẫu đã có:

- **Type 1**: `src/content/python-basics/example-type1-reverse/`
- **Type 2**: `src/content/python-basics/chapter-1/t10-cd-b12/id3/`

Copy structure và logic từ đó!

---

## 🎉 Kết luận

Template đã chuẩn bị sẵn **tất cả infrastructure**, bạn chỉ cần:

1. ✅ Tạo game qua Dev Content Manager
2. ✅ Mở file `index.ts` vừa tạo
3. ✅ Sửa `GAME_CONFIG` (test cases, starter code)
4. ✅ Code logic game (nếu cần custom UI/animation)
5. ✅ Test và hoàn thành!

**Happy coding! 🚀**
