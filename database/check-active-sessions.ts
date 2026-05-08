import pool from "../src/lib/db";

async function checkActiveSessions() {
  try {
    console.log("🔍 Kiểm tra active sessions...\n");

    const [sessions] = await pool.query(`
      SELECT 
        s.id,
        s.title,
        s.status,
        s.started_at,
        s.closed_at,
        c.name as class_name
      FROM sessions s
      JOIN classes c ON s.class_id = c.id
      WHERE s.status = 'active'
      ORDER BY s.started_at DESC
    `);

    console.log("📊 Sessions đang active:");
    console.table(sessions);

    if (Array.isArray(sessions) && sessions.length === 0) {
      console.log("\n⚠️  KHÔNG CÓ SESSION NÀO ĐANG ACTIVE!");
      console.log(
        "💡 Hãy vào Teacher Dashboard → Sessions trực tiếp → Tạo session mới",
      );
    }

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

checkActiveSessions();
