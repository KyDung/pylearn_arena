/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createLoader, plain } = require('./load-ts.cjs');

const student = { id: 20, username: 'student', role: 'student', status: 'active' };
function harness(fetch) {
  const storage = new Map();
  let cookie = '';
  const document = {
    get cookie() { return cookie; },
    set cookie(value) { cookie = value.includes('Max-Age=0') ? '' : value; },
  };
  const auth = createLoader({}, {
    fetch, document, Event,
    window: { dispatchEvent() {} },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
  })('src/lib/auth.ts');
  return { auth, document };
}
const response = (status, body) => ({ status, ok: status === 200, json: async () => body });

test('expired login clears both profile caches so the cookie cannot restore it', async () => {
  const { auth, document } = harness(async () => response(401, { success: false }));
  auth.setUser(student);
  document.cookie = `user-info=${encodeURIComponent(JSON.stringify(student))}`;
  assert.equal(await auth.refreshUser(), null);
  assert.equal(auth.getUser(), null);
  assert.equal(document.cookie, '');
});

test('session refresh uses the server profile and preserves cache on server failure', async () => {
  let status = 200;
  const { auth } = harness(async () => response(status, { success: true, user: student }));
  assert.deepEqual(plain(await auth.refreshUser()), student);
  status = 500;
  assert.equal(await auth.refreshUser(), null);
  assert.deepEqual(plain(auth.getUser()), student);
});

test('a delayed unauthorized refresh cannot clear a successful newer login', async () => {
  let finish;
  const { auth } = harness(() => new Promise(resolve => { finish = resolve; }));
  const pending = auth.refreshUser();
  auth.setUser(student);
  finish(response(401, { success: false }));
  assert.deepEqual(plain(await pending), student);
  assert.deepEqual(plain(auth.getUser()), student);
});

test('a delayed successful refresh cannot restore a logged-out user', async () => {
  let finish;
  const { auth } = harness(() => new Promise(resolve => { finish = resolve; }));
  auth.setUser(student);
  const pending = auth.refreshUser();
  auth.clearUser();
  finish(response(200, { success: true, user: student }));
  assert.equal(await pending, null);
  assert.equal(auth.getUser(), null);
});
