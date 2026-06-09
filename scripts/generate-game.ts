#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const toTsString = (value: string) =>
  JSON.stringify(String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n"));

const toTsTemplateLiteralBody = (value: string) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");

const formatIOExamples = (rows: Array<{ input: string; output: string }>) => {
  return rows
    .filter((row) => row.input.trim() || row.output.trim())
    .map(
      (row) =>
        `    { input: ${toTsString(row.input)}, output: ${toTsString(row.output)} }`,
    )
    .join(",\n");
};

const normalizePromptValue = (value: string) => value.replace(/\\n/g, "\n");

async function generateGame() {
  console.log("\n🎮 GENERATE NEW GAME\n");
  console.log("=".repeat(50));

  // Chọn loại game
  console.log("\n📋 Chọn loại game:");
  console.log(
    "  1. Type 1: Multi-Scene Function Testing (gọi hàm nhiều lần cho từng scene)",
  );
  console.log("  2. Type 2: CodeRunner Style (input/output với print)");
  console.log("  3. Legacy: Single test (template cũ)\n");

  const gameType = await question("Chọn loại (1/2/3): ");

  let templateFile = "game-template.ts";
  if (gameType === "1") {
    templateFile = "game-template-type1.ts";
  } else if (gameType === "2") {
    templateFile = "game-template-type2.ts";
  }

  // Thu thập thông tin
  const courseId = await question("Course ID (vd: python-basics): ");
  const topicId = await question("Topic ID (vd: chapter-1): ");
  const lessonId = await question("Lesson ID (vd: t10-cd-b12): ");
  const gameId = await question("Game ID (vd: id5): ");
  const title = await question("Tiêu đề game: ");

  let pythonFunction = "";
  if (gameType !== "2") {
    pythonFunction = await question("Tên hàm Python (vd: my_function): ");
  }

  console.log("\n📝 Nhập mô tả game (kết thúc bằng dòng trống):");
  const descriptionLines: string[] = [];
  while (true) {
    const line = await question("");
    if (!line.trim()) break;
    descriptionLines.push(`    ${line}`);
  }
  const description = descriptionLines.join("\n");

  console.log(
    "\nBang Input/Output minh hoa (bo trong Input de ket thuc, dung \\n de xuong dong):",
  );
  const ioExamples: Array<{ input: string; output: string }> = [];
  while (true) {
    const input = await question("Input: ");
    if (!input.trim()) break;
    const output = await question("Output: ");
    ioExamples.push({
      input: normalizePromptValue(input),
      output: normalizePromptValue(output),
    });
  }

  console.log("\n✅ Đang tạo game...\n");

  // Đường dẫn hierarchical: course/topic/lesson/game
  const contentDir = path.join(
    process.cwd(),
    "src/content",
    courseId,
    topicId,
    lessonId,
    gameId,
  );
  const publicDir = path.join(
    process.cwd(),
    "public",
    courseId,
    topicId,
    lessonId,
    gameId,
  );
  const indexPath = path.join(contentDir, "index.ts");

  // Tạo thư mục
  fs.mkdirSync(contentDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  // Đọc template
  const templatePath = path.join(
    process.cwd(),
    "src/content/_template",
    templateFile,
  );
  let template = fs.readFileSync(templatePath, "utf-8");

  // Thay thế các giá trị
  template = template.replace(
    'title: "Tiêu đề game của bạn"',
    `title: ${toTsString(title)}`,
  );
  template = template.replace(
    /description: `[\s\S]*?`,/,
    `description: \`\n${toTsTemplateLiteralBody(description)}\n  \`,`,
  );

  if (pythonFunction) {
    template = template.replace(
      'pythonFunction: "my_function"',
      `pythonFunction: "${pythonFunction}"`,
    );
    template = template.replace(
      /starterCode: `def my_function/,
      `starterCode: \`def ${pythonFunction}`,
    );
  }

  template = template.replace(
    /ioExamples:\s*\[([\s\S]*?)\],/,
    `ioExamples: [\n${formatIOExamples(ioExamples)}\n  ],`,
  );

  // Replace background paths for all scenes - hierarchical format
  const assetPath = `${courseId}/${topicId}/${lessonId}/${gameId}`;
  template = template.replace(
    /background: "\/game-id\//g,
    `background: "/${assetPath}/`,
  );

  // Ghi file
  fs.writeFileSync(indexPath, template);

  // Tạo file placeholder cho assets
  const bgPlaceholder = path.join(publicDir, "scene1.png");
  fs.writeFileSync(
    bgPlaceholder,
    "// Place your scene background images here (scene1.png, scene2.png, etc.)\n// Recommended size: 720x520px",
  );

  console.log(`✅ Game created successfully!`);
  console.log(`\n📁 Files created:`);
  console.log(`   - ${indexPath}`);
  console.log(`   - ${bgPlaceholder}`);
  console.log(`\n📝 Next steps:`);
  console.log(
    `   1. Add scene images to: public/${courseId}/${topicId}/${lessonId}/${gameId}/scene1.png, scene2.png, ...`,
  );
  console.log(`   2. Edit game logic in: ${indexPath}`);
  console.log(`   3. Add test cases in GAME_CONFIG.testCases`);
  console.log(`   4. Update starter code template`);
  console.log(`   5. Run: npx tsx scripts/add-game.ts to add to database`);
  console.log(
    `\n🎮 Game Type: ${gameType === "1" ? "Multi-Scene Function Testing" : gameType === "2" ? "CodeRunner Style" : "Legacy Single Test"}`,
  );

  rl.close();
}

generateGame().catch((error) => {
  console.error("Error:", error);
  rl.close();
  process.exit(1);
});
