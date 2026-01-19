import bcrypt from "bcryptjs";

async function testLogin() {
  const password = "123456";
  const hash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

  console.log("🔄 Testing bcrypt...");
  console.log("Password:", password);
  console.log("Hash:", hash);

  const isValid = await bcrypt.compare(password, hash);
  console.log("\n✅ Password match:", isValid);

  // Test API
  console.log("\n🔄 Testing login API...");
  try {
    const response = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "123456" }),
    });

    const data = await response.json();
    console.log("Response status:", response.status);
    console.log("Response data:", data);
  } catch (error) {
    console.error("❌ API error:", error);
  }
}

testLogin();
