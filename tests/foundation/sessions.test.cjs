/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const { createLoader, plain } = require("./load-ts.cjs");

const valid = { code: "print(42)", passed_tests: 2, total_tests: 3, score: 66.67 };

// A transactional fake with an asynchronous row lock. It catches service-level
// interleaving and rollback mistakes; it does not replace PostgreSQL integration QA.
function submissionHarness(options = {}) {
  const state = { submissions: [], committed: 0, rolledBack: 0, released: 0, connections: 0, queries: [], open: true, ...options };
  let tail = Promise.resolve();
  const pool = {
    getConnection: async () => {
      state.connections++;
      let unlock;
      let pending;
      return {
        beginTransaction: async () => {},
        query: async (sql, args) => {
          state.queries.push({ sql, args: plain(args) });
          if (sql.includes("FOR UPDATE")) {
            const before = tail;
            tail = new Promise((resolve) => { unlock = resolve; });
            await before;
            options.onLock?.(state);
            return [state.missing ? [] : [{ class_id: 4 }]];
          }
          if (sql.includes("FROM class_members")) return [state.notMember ? [] : [{ id: 1 }]];
          if (sql.startsWith("SELECT s.id FROM sessions")) return [state.open ? [{ id: args[0] }] : []];
          if (sql.startsWith("SELECT id FROM session_submissions")) {
            return [state.submissions.filter((row) => row.sessionId === args[0] && row.userId === args[1])];
          }
          if (sql.startsWith("INSERT INTO session_submissions")) {
            await new Promise((resolve) => setTimeout(resolve, 2));
            pending = { id: state.submissions.length + 1, sessionId: args[0], userId: args[1], score: args[3] };
            return [{ insertId: pending.id }];
          }
          if (sql.startsWith("UPDATE sessions SET")) {
            if (state.failStats) throw new Error("stats failed");
            return [{ affectedRows: 1 }];
          }
          throw new Error(`Unexpected SQL: ${sql}`);
        },
        commit: async () => { state.committed++; if (pending) state.submissions.push(pending); },
        rollback: async () => { state.rolledBack++; pending = undefined; },
        release: () => { state.released++; unlock?.(); },
      };
    },
  };
  const load = createLoader({ "@/lib/db": pool });
  return { ...load("src/lib/services/sessionSubmissions.ts"), state, load };
}

test("two simultaneous clicks create exactly one final submission", async () => {
  const { submitSessionCode, state } = submissionHarness();
  const results = await Promise.allSettled([submitSessionCode(9, 20, valid), submitSessionCode(9, 20, valid)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.status, 409);
  assert.equal(state.submissions.length, 1);
  assert.equal(state.committed, 1);
  assert.equal(state.rolledBack, 1);
  assert.equal(state.released, 2);
});

test("different students can each submit to the same session", async () => {
  const { submitSessionCode, state } = submissionHarness();
  await Promise.all([submitSessionCode(9, 20, valid), submitSessionCode(9, 21, valid)]);
  assert.equal(state.submissions.length, 2);
  assert.equal(state.committed, 2);
});

for (const [name, options, status] of [
  ["missing session", { missing: true }, 404],
  ["non-member", { notMember: true }, 403],
  ["expired or closed session", { open: false }, 403],
  ["session expires while waiting for its lock", { onLock: (state) => { state.open = false; } }, 403],
]) {
  test(`${name} never writes a submission`, async () => {
    const { submitSessionCode, state } = submissionHarness(options);
    await assert.rejects(submitSessionCode(9, 20, valid), (error) => error.status === status);
    assert.equal(state.submissions.length, 0);
    assert.equal(state.rolledBack, 1);
    assert.equal(state.released, 1);
  });
}

test("failure updating session totals rolls back the inserted submission", async () => {
  const { submitSessionCode, state } = submissionHarness({ failStats: true });
  await assert.rejects(submitSessionCode(9, 20, valid), /stats failed/);
  assert.equal(state.submissions.length, 0);
  assert.equal(state.committed, 0);
  assert.equal(state.rolledBack, 1);
  assert.equal(state.released, 1);
});

test("weighted coding-set score is preserved instead of replacing it by pass ratio", async () => {
  const { submitSessionCode, state } = submissionHarness();
  await submitSessionCode(9, 20, { ...valid, score: 30 });
  assert.equal(state.submissions[0].score, 30);
});

test("invalid scores, test counts and code are rejected before connecting", async () => {
  const { submitSessionCode, state } = submissionHarness();
  for (const invalid of [
    null, {}, { ...valid, score: NaN }, { ...valid, score: Infinity },
    { ...valid, score: -1 }, { ...valid, score: 101 }, { ...valid, score: "50" },
    { ...valid, passed_tests: -1 }, { ...valid, passed_tests: 4 },
    { ...valid, total_tests: 0 }, { ...valid, total_tests: 1.5 },
    { ...valid, code: "   " }, { ...valid, code: "x".repeat(200_001) },
  ]) {
    await assert.rejects(submitSessionCode(9, 20, invalid), (error) => error.status === 400);
  }
  for (const id of [0, -1, NaN, 1.5]) {
    await assert.rejects(submitSessionCode(id, 20, valid), (error) => error.status === 400);
  }
  assert.equal(state.connections, 0);
});

test("active-session list and submit checks share deadline and auto-close SQL", async () => {
  const queries = [];
  const load = createLoader({ "@/lib/db": { query: async (sql) => { queries.push(sql); return [[]]; } } });
  const service = load("src/lib/services/sessions.ts").SessionService;
  await service.getActiveSessionsForStudent(20);
  await service.isSessionActive(9);
  const policy = load("src/lib/sessionPolicy.ts").sessionAcceptingSql("s");
  for (const query of queries) assert.ok(query.includes(policy));
  assert.match(policy, /auto_close/);
  assert.match(policy, /> clock_timestamp\(\)/);
  const { submitSessionCode, state } = submissionHarness();
  await submitSessionCode(9, 20, valid);
  assert.ok(state.queries.some(({ sql }) => sql.includes(policy)));
});

test("requested player session is never replaced by another session", () => {
  const { findPlaySession } = createLoader()("src/lib/playSession.ts");
  const sessions = [{ id: 1, game_path: "game-a" }, { id: 2, game_path: "game-b" }];
  assert.equal(findPlaySession(sessions, "2", "game-a").id, 2);
  assert.equal(findPlaySession(sessions, "999", "game-a"), null);
  assert.equal(findPlaySession(sessions, "1junk", "game-a"), null);
  assert.equal(findPlaySession(sessions, "", "game-a"), null);
  assert.equal(findPlaySession(sessions, null, "unknown-game"), null);
  assert.equal(findPlaySession(sessions, null, "game-b").id, 2);
});
