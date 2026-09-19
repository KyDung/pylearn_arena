async (page) => {
  await page.unroute('**/api/**');
  const gamePath = 'python-basics/chapter-1/t10-cd-b12/id2';
  await page.addInitScript(() => {
    localStorage.setItem('pylearn-user', JSON.stringify({ id: 20, username: 'qa', role: 'student', status: 'active' }));
  });
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    let body = { success: true, data: [] };
    if (url.includes('/api/auth/me')) body = { success: true, user: { id: 20, username: 'qa', role: 'student', status: 'active' } };
    else if (url.includes('/api/games/info')) body.data = { game: { id: 2, title: 'Bảo vệ bầy cừu', path: gamePath }, lesson: { id: 1, title: 'Xâu ký tự' }, course: { slug: 'python-basics', title: 'Python' } };
    else if (url.includes('/contest-status')) body.data = { isInContest: false, contest: null, gameId: 2, rankings: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('http://localhost:3000/play?path=' + encodeURIComponent(gamePath));
  await page.locator('#submit-code').waitFor({ timeout: 60000 });
  return { ready: true, buttons: await page.locator('button').allTextContents(), textareas: await page.locator('textarea').count() };
}
