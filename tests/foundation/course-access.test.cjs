/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const { NextRequest } = require("next/server");
const { createLoader, plain } = require("./load-ts.cjs");

function accessHarness(failContent = false) {
  const calls = [];
  const tx = {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    query: async (sql, args) => {
      calls.push({ sql, args: plain(args) });
      assert.equal((sql.match(/\?/g) || []).length, args.length, "SQL placeholders must match values");
      if (failContent && sql.includes("INSERT INTO course_content_access")) throw new Error("invalid content");
      return [{ affectedRows: args.length / 5 }];
    },
  };
  const load = createLoader({ "@/lib/db": { getConnection: async () => tx } });
  return { calls, service: load("src/lib/services/courseAccess.ts") };
}

test("bulk unlock saves five values per content item and grants the course atomically", async () => {
  const { calls, service } = accessHarness();
  assert.equal(await service.bulkUnlockContent(1, 2, "lesson", ["3", "4", "3"], 10), 2);
  const writes = calls.filter((entry) => typeof entry === "object");
  assert.equal(writes.length, 2);
  assert.match(writes[0].sql, /INSERT INTO course_access/);
  assert.deepEqual(writes[1].args, [1, 2, "lesson", "3", 10, 1, 2, "lesson", "4", 10]);
  assert.deepEqual(calls.filter((entry) => typeof entry === "string"), ["begin", "commit", "release"]);
});

test("single unlock uses the same transactional path as bulk unlock", async () => {
  const { calls, service } = accessHarness();
  await service.unlockContent(1, 2, "topic", "3", 10);
  assert.ok(calls.some((call) => call.sql?.includes("INSERT INTO course_access")));
  assert.ok(calls.includes("commit"));
});

test("failed content update rolls back its course grant", async () => {
  const { calls, service } = accessHarness(true);
  await assert.rejects(service.bulkUnlockContent(1, 2, "lesson", ["3"], 10), /invalid content/);
  assert.ok(calls.includes("rollback"));
  assert.ok(!calls.includes("commit"));
  assert.equal(calls.at(-1), "release");
});

for (const [path, method] of [
  ["teacher/course-access", "POST"],
  ["teacher/course-access", "DELETE"],
  ["teacher/course-access", "GET"],
  ["teacher/course-access/show-course", "POST"],
  ["teacher/course-access/hide-course", "POST"],
  ["teacher/contests", "POST"],
]) {
  test(`${method} ${path} blocks a teacher from another teacher's class`, async () => {
    const calls = [];
    const load = createLoader({
      "@/lib/db": { query: async (sql) => {
        calls.push(sql);
        if (sql.includes("SELECT teacher_id FROM classes")) return [[{ teacher_id: 11 }]];
        throw new Error(`Unexpected query: ${sql}`);
      } },
      "@/lib/services/users": { getUserById: async () => ({ id: 10, role: "teacher", status: "active" }) },
      "@/lib/authToken": { verifyToken: () => ({ userId: 10 }) },
      "next/headers": { cookies: async () => ({ get: () => ({ value: "token" }) }) },
    });
    const body = {
      classId: 4, courseId: 2, contentType: "lesson", contentId: "3",
      class_id: 4, game_id: 1, title: "Contest", start_time: "2026-09-18T08:00:00Z", end_time: "2026-09-18T09:00:00Z",
    };
    const req = new NextRequest(`http://localhost/api/${path}?classId=4&courseId=2`, {
      method, ...(method === "GET" ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    const response = await load(`src/app/api/${path}/route.ts`)[method](req, {});
    assert.equal(response.status, 403);
    assert.equal(calls.length, 1);
  });
}

test("class policy allows the owner and admin but rejects missing or malformed classes", async () => {
  const load = createLoader({
    "@/lib/db": { query: async (_sql, args) => [args[0] === 4 ? [{ teacher_id: 10 }] : []] },
    "@/lib/services/users": {},
  });
  const { canManageClassById } = load("src/lib/classAccess.ts");
  assert.equal(await canManageClassById({ id: 10, role: "teacher" }, 4), true);
  assert.equal(await canManageClassById({ id: 1, role: "admin" }, 4), true);
  assert.equal(await canManageClassById({ id: 10, role: "student" }, 4), false);
  assert.equal(await canManageClassById({ id: 1, role: "admin" }, 999), false);
  assert.equal(await canManageClassById({ id: 1, role: "admin" }, NaN), false);
});
