async (page) => {
  let role = 'admin';
  const requests = [];
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  const user = () => ({ id: role === 'admin' ? 5 : role === 'teacher' ? 7 : 20, username: 'qa_' + role, fullName: 'Kiểm tra ' + role, role, status: 'active' });
  const classes = [{ id: 4, name: 'Lớp kiểm tra', code: 'QA123', teacherId: 7, teacherName: 'Giáo viên', studentCount: 5, status: 'active', members: [], createdAt: new Date().toISOString() }];
  const courses = [{ id: 1, title: 'Python kiểm tra', slug: 'python-basics', is_published: true, topics: [] }];
  await page.unroute('**/api/**');
  await page.route('**/api/**', async route => {
    const [path, query = ''] = route.request().url().split(/https?:\/\/[^/]+/)[1].split('?');
    const url = { search: query ? '?' + query : '', searchParams: { get: key => decodeURIComponent((query.split('&').find(part => part.startsWith(key + '=')) || '').split('=').slice(1).join('=')) } };
    requests.push(path + url.search);
    let body = { success: true, data: [] };
    if (path === '/api/auth/me') body = { success: true, user: user() };
    else if (path === '/api/admin/users') body.data = { items: [{ id: 20, username: url.searchParams.get('search') || 'student_qa', fullName: 'Học sinh kiểm tra', role: 'student', status: 'active' }], total: 1, page: 1, pageSize: 50, totalPages: 1 };
    else if (path === '/api/admin/stats') body.data = { total: 29, byRole: { admin: 1, teacher: 2, student: 26 }, byStatus: { active: 29, inactive: 0, suspended: 0 }, recentlyCreated: 0 };
    else if (path === '/api/classes') body.data = { items: classes, total: 1 };
    else if (path === '/api/classes/4') body.data = classes[0];
    else if (path === '/api/classes/4/members') body.data = [{ userId: 20 }];
    else if (path.includes('/courses/1/access')) body.data = { topics: [{ id: 1, title: 'Chương kiểm tra' }], lessons: [{ id: '1', topic_id: 1, title: 'Bài kiểm tra', isUnlocked: true }] };
    else if (path === '/api/classes/4/courses') body.data = courses.map(c => ({ ...c, course_id: c.id }));
    else if (path === '/api/courses') body = { success: true, courses };
    else if (path === '/api/admin/courses' || path === '/api/teacher/courses') body.data = courses;
    else if (path === '/api/assignments') body.data = { items: [], total: 0 };
    else if (path === '/api/teacher/sessions') body.data = { items: [], total: 0 };
    else if (path === '/api/student/contests/active') body.data = { contests: [] };
    else if (path === '/api/teacher/course-access' && !url.search) body.data = { classes };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const results = [];
  for (const [path, asRole] of [['/admin','admin'],['/admin/overview','admin'],['/teacher','teacher'],['/student','student'],['/profile','teacher'],['/contests','teacher'],['/teacher/accounts','teacher'],['/teacher/class/4','teacher'],['/teacher/class/4/courses','teacher'],['/teacher/class/4/courses/1','teacher'],['/teacher/sessions','teacher'],['/student/sessions','student'],['/student/contests','student'],['/admin/courses','admin'],['/teacher/assignment/create','teacher']]) {
    role = asRole;
    const begin = requests.length;
    await page.goto('http://localhost:3000' + path);
    await page.waitForTimeout(1200);
    const initial = requests.length;
    await page.waitForTimeout(900);
    const body = await page.locator('body').innerText();
    results.push({ path, url: page.url(), requests: initial - begin, extraRequests: requests.length - initial, loadingOnly: /^Đang tải\.\.\.$/.test(body.trim()), text: body.slice(0, 160) });
  }
  return { results, failures };
}
