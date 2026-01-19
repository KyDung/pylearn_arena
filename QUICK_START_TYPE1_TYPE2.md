# 🚀 QUICK START - TẠO GAME TYPE 1 & TYPE 2

## ⚡ TÓM TẮT NHANH

### Type 1: Multi-Scene Function Testing

```bash
# Tạo game
npx tsx scripts/generate-game.ts
→ Chọn: 1
→ Course: python-basics
→ Game ID: my-game-id
→ Function: my_function
```

### Type 2: CodeRunner Style

```bash
# Tạo game
npx tsx scripts/generate-game.ts
→ Chọn: 2
→ Course: python-basics
→ Game ID: my-game-id
→ (Không cần function name)
```

---

## 📋 WORKFLOW ĐẦY ĐỦ

### 1. Generate Game Template

```bash
cd pylearn_arena
npx tsx scripts/generate-game.ts
```

**Output:**

```
🎮 GENERATE NEW GAME
==================================================

📋 Chọn loại game:
  1. Type 1: Multi-Scene Function Testing
  2. Type 2: CodeRunner Style
  3. Legacy: Single test

Chọn loại (1/2/3): 1

Course ID (vd: python-basics): python-basics
Game ID (vd: t10-cd-b12-id5): string-reverse
Tiêu đề game: Đảo ngược chuỗi
Tên hàm Python (vd: my_function): reverse_string

📝 Nhập mô tả game (kết thúc bằng dòng trống):
Viết hàm reverse_string() để đảo ngược một chuỗi.
Input: một chuỗi bất kỳ
Output: chuỗi đã đảo ngược
[Enter 2 lần]

✅ Game created successfully!
```

### 2. Thêm Scene Images

```bash
# Tạo/copy 3 background images (720x520px)
public/string-reverse/
  scene1.png
  scene2.png
  scene3.png
```

### 3. Edit Game Config

Mở: `src/content/python-basics/string-reverse/index.ts`

#### Type 1 Config:

```typescript
const GAME_CONFIG = {
  title: "Đảo ngược chuỗi",
  description: `Viết hàm reverse_string() để đảo ngược chuỗi`,

  pythonFunction: "reverse_string",

  starterCode: `def reverse_string(text):
    # Viết code ở đây
    return result`,

  testCases: [
    {
      input: "hello",
      expected: "olleh",
      description: "Test basic string",
      sceneText: "🎮 Level 1: Basic",
    },
    {
      input: "Python",
      expected: "nohtyP",
      description: "Test capital letters",
      sceneText: "🎮 Level 2: Capital",
    },
    {
      input: "12345",
      expected: "54321",
      description: "Test numbers",
      sceneText: "🎮 Level 3: Numbers",
    },
  ],

  sceneAssets: [
    { background: "/string-reverse/scene1.png" },
    { background: "/string-reverse/scene2.png" },
    { background: "/string-reverse/scene3.png" },
  ],
};
```

#### Type 2 Config:

```typescript
const GAME_CONFIG = {
  title: "Cộng hai số",
  description: `Đọc 2 số và in tổng`,

  starterCode: `a = int(input())
b = int(input())
result = a + b
print(result)`,

  testCases: [
    {
      input: "5\n10", // \n = newline separator
      expected: "15",
      description: "Test small numbers",
      sceneText: "🎮 Level 1",
    },
    {
      input: "100\n200",
      expected: "300",
      description: "Test large numbers",
      sceneText: "🎮 Level 2",
    },
  ],

  sceneAssets: [
    { background: "/add-numbers/scene1.png" },
    { background: "/add-numbers/scene2.png" },
  ],
};
```

### 4. Add to Database

```bash
npx tsx scripts/add-game.ts
```

```
Course ID: 1
Lesson ID: 1 (chọn từ list)
Game title: Đảo ngược chuỗi
Description: Viết hàm reverse_string()...
Game type: coding
Path: string-reverse
Order index: 1
```

### 5. Test Game

```bash
pnpm dev
```

Mở: http://localhost:3000
→ Course → Topic → Lesson → Chơi game

---

## 🎯 SỰ KHÁC BIỆT

| Feature             | Type 1            | Type 2            |
| ------------------- | ----------------- | ----------------- |
| **Code structure**  | Viết hàm          | input() + print() |
| **Test mechanism**  | Gọi hàm nhiều lần | So sánh stdout    |
| **Input format**    | Python value      | String với \n     |
| **Expected format** | Python value      | String output     |
| **Use case**        | Bài tập hàm       | Bài tập I/O       |

---

## 💡 VÍ DỤ CỤ THỂ

### Type 1: Tìm số lớn nhất

```typescript
pythonFunction: "find_max",

starterCode: `def find_max(numbers):
    # numbers là list: [1, 5, 3, 9, 2]
    max_num = numbers[0]
    # Code của bạn
    return max_num`,

testCases: [
  {
    input: "[1, 5, 3]",     // Python list as string
    expected: "5",
    description: "Test case 1",
    sceneText: "Level 1"
  },
  {
    input: "[10, -5, 20, 0]",
    expected: "20",
    description: "Test case 2",
    sceneText: "Level 2"
  },
],
```

**Python validation:**

```python
result = find_max([1, 5, 3])  # Hàm được gọi trực tiếp
# result === "5" → PASS
```

### Type 2: Tính trung bình

```typescript
starterCode: `# Đọc 3 số
a = float(input())
b = float(input())
c = float(input())

# Tính trung bình
avg = (a + b + c) / 3
print(f"{avg:.2f}")`,

testCases: [
  {
    input: "10\n20\n30",    // 3 dòng input
    expected: "20.00",      // Expected output
    description: "Test case 1",
    sceneText: "Level 1"
  },
  {
    input: "5.5\n7.3\n9.2",
    expected: "7.33",
    description: "Test case 2",
    sceneText: "Level 2"
  },
],
```

**Python validation:**

```python
# stdin: "10\n20\n30"
a = input()  # "10"
b = input()  # "20"
c = input()  # "30"
print(result)  # stdout: "20.00"
# Compare stdout === "20.00" → PASS
```

---

## 🔍 DEBUG TIPS

### Type 1 Issues

**Lỗi:** `Chưa thấy hàm my_function()`

```typescript
// Fix: Đảm bảo tên hàm khớp
pythonFunction: "reverse_string",  // ← Phải khớp với def
starterCode: `def reverse_string(text):  # ← Khớp ở đây
```

**Lỗi:** Test case fail

```typescript
// Debug: Log input/output
console.log("Input:", testCase.input);
console.log("Expected:", testCase.expected);
console.log("Got:", result);
```

### Type 2 Issues

**Lỗi:** Wrong output

```typescript
// Fix: Check input format
input: "5\n10",     // ✅ Correct: \n = newline
input: "5 10",      // ❌ Wrong: space only
```

**Lỗi:** Trim issues

```typescript
// Output automatically trimmed:
expected: "15",      // ✅ Both work
expected: "15\n",    // ✅ Trimmed to "15"
```

---

## 📊 TEST CASE TABLE

Bảng này hiện **sau scene cuối**:

```
┌────────┬───────┬──────────┬─────────────┬────────┐
│ Scene  │ Input │ Expected │ Your Output │ Result │
├────────┼───────┼──────────┼─────────────┼────────┤
│ Scene 1│ hello │ olleh    │ olleh       │ ✓ Pass │
│ Scene 2│ Python│ nohtyP   │ nohtyP      │ ✓ Pass │
│ Scene 3│ 12345 │ 54321    │ 12345       │ ✗ Fail │
└────────┴───────┴──────────┴─────────────┴────────┘
```

**Học sinh thấy được:**

- Input của từng test case
- Expected output
- Output của code họ
- Pass/Fail status

---

## 🎮 GAME FLOW

```
Student clicks Submit
       ↓
Load Scene 1
       ↓
Run test with input 1
       ↓
Show ✓ PASS or ✗ FAIL (1.5s)
       ↓
Load Scene 2
       ↓
Run test with input 2
       ↓
Show ✓ PASS or ✗ FAIL (1.5s)
       ↓
Load Scene 3
       ↓
Run test with input 3
       ↓
Show ✓ PASS or ✗ FAIL (1.5s)
       ↓
Display Test Case Table 📊
```

**Features:**

- ✅ Auto progression (1.5s mỗi scene)
- ✅ Visual feedback (green/red)
- ✅ Sound effects
- ✅ Scene counter (Scene 1/3)
- ✅ Final summary table

---

## 📚 TÀI LIỆU THAM KHẢO

- [GAME_TYPES_GUIDE.md](./GAME_TYPES_GUIDE.md) - Chi tiết đầy đủ
- [example-type1-reverse](./src/content/python-basics/example-type1-reverse/) - Ví dụ Type 1
- [example-type2-add](./src/content/python-basics/example-type2-add/) - Ví dụ Type 2

---

## ✅ CHECKLIST

### Before Submit

- [ ] Đã test cả 3 test cases
- [ ] Background images có đủ (scene1-3.png)
- [ ] GAME_CONFIG có đúng số testCases vs sceneAssets
- [ ] starterCode có syntax đúng
- [ ] Game đã add vào database

### Troubleshooting

- [ ] Server restart: `pnpm dev`
- [ ] Clear browser cache
- [ ] Check console.log errors
- [ ] Verify image paths: `/game-id/scene1.png`

---

🎉 **Xong! Bây giờ bạn có thể tạo game với multi-scene testing!**
