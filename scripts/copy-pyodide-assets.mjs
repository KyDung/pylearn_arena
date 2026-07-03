import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "node_modules", "pyodide");
const targetDir = join(root, "public", "pyodide");

const files = [
  "pyodide.js",
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

if (!existsSync(sourceDir)) {
  throw new Error(
    "Không tìm thấy node_modules/pyodide. Hãy chạy npm install trước.",
  );
}

mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  const source = join(sourceDir, file);
  const target = join(targetDir, file);

  if (!existsSync(source)) {
    throw new Error(`Thiếu Pyodide asset: ${source}`);
  }

  const sourceSize = statSync(source).size;
  const targetExists = existsSync(target);
  const targetSize = targetExists ? statSync(target).size : -1;

  if (!targetExists || sourceSize !== targetSize) {
    copyFileSync(source, target);
  }
}

console.log(`Pyodide assets ready: ${targetDir}`);
