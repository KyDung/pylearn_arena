// Test API trực tiếp
fetch("http://localhost:3001/api/student/courses", {
  headers: {
    Cookie: document.cookie,
  },
})
  .then((r) => r.json())
  .then((data) => {
    console.log("=== API Response ===");
    console.log("Success:", data.success);
    console.log("Data:", data.data);
    console.log("Courses count:", data.data?.length || 0);
    console.table(data.data);
  })
  .catch((err) => console.error("Error:", err));
