/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const { NextRequest } = require("next/server");
const jwt = require("jsonwebtoken");
const { createLoader, plain } = require("./load-ts.cjs");

const actorRow = { id: 10, username: "teacher-a", role: "teacher", status: "active", created_by: 1 };
const studentRow = { id: 20, username: "student-a", role: "student", status: "active", created_by: 10 };

function harness({ actor = actorRow, target = studentRow, cookie, extraQuery } = {}) {
  const calls = [];
  let cookieValue = cookie;
  const db = {
    query: async (sql, args = []) => {
      calls.push({ sql, args: plain(args) });
      if (sql.includes("FROM users WHERE id = ?")) {
        const row = args[0] === actor?.id ? actor : args[0] === target?.id ? target : null;
        return [row ? [row] : []];
      }
      if (extraQuery) return extraQuery(sql, args);
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const load = createLoader({
    "@/lib/db": db,
    "next/headers": { cookies: async () => ({ get: () => cookieValue ? { value: cookieValue } : undefined }) },
    bcryptjs: { compare: async (password, hash) => password === "correct" && hash === "hash", hash: async () => "hash" },
  });
  if (cookie === undefined && actor) {
    cookieValue = load("src/lib/authToken.ts").createToken({ userId: actor.id, username: actor.username, role: actor.role });
  }
  return { load, calls, setCookie: (value) => { cookieValue = value; } };
}

function request(url = "/", method = "GET", body) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
}

test("user mapper preserves suspended status, creator and profile fields", async () => {
  const { load } = harness({ actor: { ...actorRow, status: "suspended", phone: "123", avatar: "/avatar.png" } });
  const user = await load("src/lib/services/users.ts").getUserById(10);
  assert.equal(user.status, "suspended");
  assert.equal(user.createdBy, 1);
  assert.equal(user.phone, "123");
});

for (const status of ["suspended", "inactive", "banned"]) {
  test(`issued JWT stops working when DB status becomes ${status}`, async () => {
    const { load } = harness({ actor: { ...actorRow, status } });
    assert.equal(await load("src/lib/apiAuth.ts").getCurrentUser(request()), null);
    const response = await load("src/app/api/auth/me/route.ts").GET(request());
    assert.equal(response.status, 401);
    assert.equal((await response.json()).user, null);
  });
}

test("forged JSON cookie is rejected before querying any user", async () => {
  const { load, calls } = harness({ cookie: JSON.stringify({ id: 1, role: "admin" }) });
  assert.equal(await load("src/lib/apiAuth.ts").getCurrentUser(request()), null);
  assert.equal(calls.length, 0);
});

test("authorization uses current DB role, not a stale admin JWT claim", async () => {
  const { load, setCookie } = harness();
  setCookie(load("src/lib/authToken.ts").createToken({ userId: 10, username: "teacher-a", role: "admin" }));
  assert.equal((await load("src/lib/apiAuth.ts").getCurrentUser(request())).role, "teacher");
});

test("Bearer token follows the same active-account policy", async () => {
  const { load } = harness({ cookie: "" });
  const token = load("src/lib/authToken.ts").createToken({ userId: 10, username: "teacher-a", role: "teacher" });
  const req = new NextRequest("http://localhost", { headers: { Authorization: `Bearer ${token}` } });
  assert.equal((await load("src/lib/apiAuth.ts").getCurrentUser(req)).id, 10);
});

test("token parser rejects invalid user IDs and expired tokens", () => {
  const { verifyToken } = createLoader()("src/lib/authToken.ts");
  const secret = "foundation-test-secret-never-used-in-production";
  for (const userId of [0, -1, "10", 1.5]) {
    assert.equal(verifyToken(jwt.sign({ userId, username: "x", role: "admin" }, secret)), null);
  }
  assert.equal(verifyToken(jwt.sign({ userId: 10, username: "x", role: "admin" }, secret, { expiresIn: -1 })), null);
});

test("production refuses a missing or example JWT secret", () => {
  for (const JWT_SECRET of [undefined, "change-this-secret", "pylearn-secret-key-change-in-production"]) {
    const load = createLoader({}, { process: { env: { NODE_ENV: "production", JWT_SECRET } } });
    assert.throws(() => load("src/lib/authToken.ts").createToken({ userId: 1, username: "x", role: "admin" }), /JWT_SECRET/);
  }
});

test("login rejects locked accounts and never sets a login cookie", async () => {
  const { load } = harness({ extraQuery: () => [[{ ...actorRow, password: "hash", status: "suspended" }]] });
  const response = await load("src/app/api/auth/login/route.ts").POST(request("/api/auth/login", "POST", { username: "teacher-a", password: "correct" }));
  assert.equal(response.status, 403);
  assert.equal(response.cookies.get("auth-token"), undefined);
});

test("active login emits an HttpOnly JWT and keeps the existing user response", async () => {
  const { load } = harness({ extraQuery: () => [[{ ...actorRow, full_name: "Teacher A", password: "hash" }]] });
  const response = await load("src/app/api/auth/login/route.ts").POST(request("/api/auth/login", "POST", { username: "teacher-a", password: "correct" }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.fullName, "Teacher A");
  assert.ok(response.headers.get("set-cookie").includes("HttpOnly"));
  assert.equal(load("src/lib/authToken.ts").verifyToken(response.cookies.get("auth-token").value).userId, 10);
});

test("list queries apply creator and status to both count and results", async () => {
  const { load, calls } = harness({ extraQuery: (sql) => sql.includes("COUNT(*)") ? [[{ total: 0 }]] : [[]] });
  await load("src/lib/services/users.ts").getUsers({ role: "student", createdBy: 10, status: "suspended" });
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.match(call.sql, /created_by = \?/);
    assert.match(call.sql, /status IN \(\?, \?\)/);
    assert.deepEqual(call.args.slice(0, 4), ["student", "suspended", "banned", 10]);
  }
});

test("single and bulk account creation save the creator", async () => {
  const { load, calls } = harness({ extraQuery: () => [{ insertId: 20, affectedRows: 1 }] });
  const users = load("src/lib/services/users.ts");
  await users.createUser({ username: "new", password: "correct", role: "student", createdBy: 10 });
  await users.bulkCreateUsers([{ username: "new-bulk", password: "correct", role: "student" }], 10);
  const inserts = calls.filter((call) => call.sql.includes("INSERT INTO users"));
  assert.equal(inserts.length, 2);
  for (const call of inserts) {
    assert.match(call.sql, /created_by/);
    assert.equal(call.args.at(-1), 10);
    assert.equal((call.sql.match(/\?/g) || []).length, call.args.length);
  }
});

for (const target of [
  { ...studentRow, created_by: 11 },
  { ...studentRow, created_by: null },
  { ...studentRow, role: "admin" },
  { ...studentRow, role: "teacher" },
]) {
  test(`teacher cannot suspend target ${target.role} owned by ${target.created_by}`, async () => {
    const { load, calls } = harness({ target });
    const response = await load("src/app/api/admin/users/[userId]/route.ts").PATCH(
      request("/api/admin/users/20", "PATCH", { action: "suspend" }),
      { params: Promise.resolve({ userId: "20" }) },
    );
    assert.equal(response.status, 403);
    assert.ok(!calls.some((call) => call.sql.startsWith("UPDATE")));
  });
}

test("teacher can suspend their own student; admin can manage another teacher's student", async () => {
  for (const actor of [actorRow, { ...actorRow, role: "admin" }]) {
    const target = { ...studentRow, created_by: actor.role === "admin" ? 11 : actor.id };
    const { load } = harness({ actor, target, extraQuery: () => [{ affectedRows: 1 }] });
    const response = await load("src/app/api/admin/users/[userId]/route.ts").PATCH(
      request("/api/admin/users/20", "PATCH", { action: "suspend" }),
      { params: Promise.resolve({ userId: "20" }) },
    );
    assert.equal(response.status, 200);
  }
});

test("admin cannot accidentally suspend their own account", async () => {
  const { load } = harness({ actor: { ...actorRow, role: "admin" } });
  const response = await load("src/app/api/admin/users/[userId]/route.ts").PATCH(
    request("/api/admin/users/10", "PATCH", { action: "suspend" }),
    { params: Promise.resolve({ userId: "10" }) },
  );
  assert.equal(response.status, 403);
});

for (const route of ["progress", "admin/users/template"]) {
  test(`${route} rejects unsigned JSON cookies and accepts normal JWT login`, async () => {
    const { load, setCookie } = harness({ cookie: '{"id":1,"role":"admin"}', extraQuery: () => [[]] });
    const api = load(`src/app/api/${route}/route.ts`);
    assert.equal((await api.GET(request(`/api/${route}`))).status, 401);
    setCookie(load("src/lib/authToken.ts").createToken({ userId: 10, username: "teacher-a", role: "teacher" }));
    assert.equal((await api.GET(request(`/api/${route}`))).status, 200);
  });
}

test("auth wrapper catches DB failures without exposing internal errors", async () => {
  const load = createLoader({
    "@/lib/services/users": { getUserById: async () => { throw new Error("private database details"); } },
    "@/lib/authToken": { verifyToken: () => ({ userId: 10 }) },
    "next/headers": { cookies: async () => ({ get: () => ({ value: "token" }) }) },
  });
  const api = load("src/lib/apiAuth.ts");
  const response = await api.withAuth(async () => { throw new Error("should not execute"); })(request(), {});
  assert.equal(response.status, 500);
  assert.ok(!(await response.text()).includes("private database"));
});

test("legacy banned status is exposed as suspended and included in locked-account stats", async () => {
  const { load } = harness({ actor: { ...actorRow, status: "banned" }, extraQuery: (sql) => {
    if (sql.includes("GROUP BY role")) return [[{ role: "student", count: 3 }]];
    if (sql.includes("GROUP BY status")) return [[{ status: "suspended", count: 1 }, { status: "banned", count: 2 }]];
    return [[{ count: 0 }]];
  } });
  const users = load("src/lib/services/users.ts");
  assert.equal((await users.getUserById(10)).status, "suspended");
  assert.equal((await users.getUserStats()).byStatus.suspended, 3);
});
