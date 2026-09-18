/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");

// Exercise the real TS modules and Next responses. Replace only external I/O.
// Refuse to load the real DB so tests cannot touch configured school data.
function createLoader(overrides = {}, globals = {}) {
  const cache = new Map();
  function load(relativePath) {
    const filename = path.resolve(root, relativePath);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: filename,
    }).outputText;
    const localRequire = (id) => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id === "@/lib/db" || id === "pg" || id.startsWith("mysql2")) {
        throw new Error("Tests must not connect to a real database");
      }
      if (id.startsWith("@/")) return load(`src/${id.slice(2)}.ts`);
      if (id.startsWith(".")) return load(path.resolve(path.dirname(filename), `${id}.ts`));
      return require(id);
    };
    vm.runInNewContext(code, {
      module: loadedModule, exports: loadedModule.exports, require: localRequire,
      console: { ...console, error() {}, warn() {} },
      process: { env: { NODE_ENV: "test", JWT_SECRET: "foundation-test-secret-never-used-in-production" } },
      Error, SyntaxError, TypeError, Date, URL, setTimeout, clearTimeout,
      ...globals,
    }, { filename });
    return loadedModule.exports;
  }
  return load;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { createLoader, plain };
