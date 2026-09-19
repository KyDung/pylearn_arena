async (page) => {
  await page.unroute('**/api/**');
  let role = 'admin';
  let expired = false;
  const requests = [];
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    const path = url.split(/https?:\/\/[^/]+/)[1].split('?')[0];
    requests.push(url);
    let body = { success: true, data: [] };
    let status = 200;
    if (path === '/api/auth/me') {
      body = expired ? { success: false } : { success: true, user: { id: 20, username: 'qa', fullName: 'QA', role, status: 'active' } };
      status = expired ? 401 : 200;
    } else if (path === '/api/admin/users') {
      const term = decodeURIComponent((url.match(/[?&]search=([^&]*)/) || [])[1] || 'initial');
      if (term === 'old') await page.waitForTimeout(1200);
      body.data = { items: [{ id: 20, username: term, fullName: term, role: 'student', status: 'active' }], total: 1, page: 1, totalPages: 1 };
    } else if (path === '/api/admin/stats') body.data = { total: 1, byRole: { admin: 1, teacher: 0, student: 0 }, byStatus: { active: 1 }, recentlyCreated: 0 };
    else if (path === '/api/classes') body.data = { items: [] };
    else if (path === '/api/assignments/1') body.data = { assignment: { id: 1, title: 'Bài có thời hạn', start_time: new Date(Date.now() - 60000).toISOString(), end_time: new Date(Date.now() + 3000).toISOString(), late_submission: false, status: 'published', game_path: 'python-basics/chapter-1/t10-cd-b12/id2' }, submissions: [], rankings: [] };
    else if (path.startsWith('/api/sessions/')) body.data = { session: { id: 1, title: 'Phiên QA', session_code: 'QA123', lesson_title: 'Bài QA', game_title: 'Game QA', expires_at: new Date(Date.now()+60000).toISOString() }, rankings: [] };
    else if (path === '/api/student/contests/1') body.data = { contest: { id: 1, title: 'Cuộc thi QA', end_time: new Date(Date.now() + 60000).toISOString() }, games: [], rankings: [], myProgress: { completedGames: 0, totalGames: 0, totalScore: 0 } };
    else if (path === '/api/courses') body = { success: true, courses: [{ id: 1, slug: 'python-basics', title: 'Python QA' }] };
    else if (path.endsWith('/topics')) body = { success: true, topics: [] };
    else if (path === '/api/student/course-access') body.data = { topics: [], lessons: [] };
    else if (path === '/api/teacher/course-access') body.data = { classes: [] };
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {});
  });
  const results = [];
  await page.goto('http://localhost:3000/admin');
  await page.getByPlaceholder(/Tìm kiếm/).fill('old');
  await page.waitForTimeout(450);
  await page.getByPlaceholder(/Tìm kiếm/).fill('new');
  await page.waitForTimeout(1600);
  results.push({ check: 'admin latest search', pass: (await page.locator('tbody').innerText()).includes('new') && !(await page.locator('tbody').innerText()).includes('old') });
  role = 'teacher';
  await page.goto('http://localhost:3000/teacher/accounts');
  await page.getByPlaceholder(/Tìm kiếm/).fill('old');
  await page.waitForTimeout(400);
  await page.getByPlaceholder(/Tìm kiếm/).fill('new');
  await page.waitForTimeout(1600);
  results.push({ check: 'teacher latest search', pass: (await page.locator('tbody').innerText()).includes('new') && !(await page.locator('tbody').innerText()).includes('old') });
  role = 'student';
  for (const path of ['/student/assignment/1','/student/contests/1','/course/python-basics','/student/submit?code=QA123']) {
    await page.goto('http://localhost:3000'+path);
    await page.waitForTimeout(1500);
    const count = requests.length;
    const before = await page.locator('body').innerText();
    await page.waitForTimeout(2200);
    const after = await page.locator('body').innerText();
    results.push({ check: path, requestsWhileIdle: requests.length-count, countdownChanged: before !== after, expired: after.includes('Đã hết hạn'), body: after.slice(0,150) });
  }
  await page.goto('http://localhost:3000/admin');
  await page.waitForTimeout(900);
  results.push({ check: 'student denied admin', pass: page.url() === 'http://localhost:3000/' });
  expired = true;
  await page.goto('http://localhost:3000/profile');
  await page.waitForTimeout(1200);
  results.push({ check: 'expired session redirects', pass: page.url().includes('/login?next=profile') });
  return { results, failures };
}
