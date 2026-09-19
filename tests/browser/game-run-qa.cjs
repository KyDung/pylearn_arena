async (page) => {
  const measure = async () => ({ code: await page.locator('.code-panel').boundingBox(), game: await page.locator('.phaser-frame').boundingBox() });
  const before = await measure();
  const results = [];
  for (const code of ["s = input()\nprint('x' * 400)", "s = input()\ni = s.find('soi')\nprint('CO' if i >= 0 else 'KHONG')\nprint(i)"]) {
    await page.getByRole('textbox').fill(code);
    await page.getByRole('button', { name: '▶ Chạy Code', exact: true }).click();
    await page.waitForTimeout(1800);
    results.push({ geometry: await measure(), output: (await page.locator('#output').innerText()).slice(0,250) });
  }
  await page.screenshot({ path: 'output/playwright/game-id2-checked.png', fullPage: true });
  return { before, results };
}
