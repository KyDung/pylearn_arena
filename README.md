# LearnPythonWeb - Next.js Version

Nền tảng học Python tương tác qua mini-game với Phaser.js và Pyodide.

## 🚀 Công nghệ

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Phaser 3.90.0** - Game engine
- **Pyodide 0.29.1** - Python in browser
- **Supabase/PostgreSQL** - Database
- **pnpm** - Package manager

## 📦 Cài đặt

### 1. Cài đặt dependencies

```bash
pnpm install
```

### 2. Cấu hình Supabase Database

```bash
# Copy file config mẫu
cp .env.example .env

# Chỉnh sửa thông tin database trong .env
SUPABASE_DB_URL=postgresql://postgres.your-project-ref:your-password@aws-0-region.pooler.supabase.com:6543/postgres
SUPABASE_DB_SSL=true
```

### 3. Khởi tạo database

```bash
# Chạy migration để tạo tables trên Supabase/Postgres
pnpm db:supabase

# Hoặc copy nội dung file này vào Supabase SQL Editor
# database/supabase/schema.sql
```

### 4. Chạy ứng dụng

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## 🏗️ Cấu trúc dự án

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Trang chủ
│   ├── game/              # Danh sách khóa học
│   ├── course/[courseId]/ # Chi tiết khóa học
│   ├── lesson/[courseId]/[lessonId]/ # Chi tiết bài học
│   ├── play/              # Trang chơi game
│   ├── login/             # Đăng nhập
│   ├── profile/           # Hồ sơ user
│   └── api/               # API routes
│       └── auth/          # Authentication APIs
│       └── courses/       # Course APIs
├── components/            # React components
├── lib/                   # Utilities
│   ├── db.ts             # Database connection
│   └── auth.ts           # Authentication
├── data/                  # JSON data (legacy)
├── content/              # Game modules
│   ├── _template/        # Game template
│   └── python-basics/    # Python course games
└── types/                # TypeScript types

database/
├── schema.sql            # Users table
├── schema-courses.sql    # Courses & lessons tables
├── init-full.ts          # Initialize all tables
└── test.ts              # Test database connection

scripts/
├── generate-game.ts      # Generate new game from template
└── add-lesson.ts        # Add lesson to database

public/
├── sound_global/         # Global sound effects
└── [gameId]/            # Game-specific assets
```

## 🎮 Tính năng

✅ Supabase/PostgreSQL database với phân quyền Admin/Teacher/Student
✅ Course Management từ database
✅ Interactive Games với Phaser
✅ Python Execution trong browser với Pyodide
✅ Code Editor với syntax highlighting
✅ Test Cases tự động
✅ Responsive Design
✅ Sound Effects
✅ Game Template System - dễ dàng tạo game mới

## 🔐 Demo Accounts

**Admin:**

- Username: `admin`
- Password: `123456`

**Student:**

- Username: `testuser`
- Password: `123456`

## 📚 Thêm Khóa Học & Bài Học Mới

### Quick Start (3 bước):

**Xem chi tiết:** [QUICK_START.md](./QUICK_START.md)
**Hướng dẫn đầy đủ:** [ADDING_CONTENT.md](./ADDING_CONTENT.md)

```bash
# 1. Tạo game mới
npx tsx scripts/generate-game.ts

# 2. Thêm vào database
npx tsx scripts/add-lesson.ts

# 3. Đăng ký game trong PlayGameContent.tsx
```

## 🔧 Development

Server chạy tại: http://localhost:3001

### Database Setup

```bash
# Khởi tạo toàn bộ database Supabase/Postgres
pnpm db:supabase
```

## 🎯 Scripts Hữu Ích

```bash
# Generate game mới từ template
npx tsx scripts/generate-game.ts

# Thêm lesson vào database
npx tsx scripts/add-lesson.ts

# Test database connection
npx tsx database/test.ts

# Fix passwords (nếu cần)
npx tsx database/fix-passwords.ts
```

# or

bun dev

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
```
