const { test, expect } = require('@playwright/test');

test('history h5 smoke', async ({ page }) => {
  const events = {
    console: [],
    pageErrors: [],
    failed: [],
    api: [],
  };

  page.on('console', (msg) => {
    if (msg.type() !== 'warning') {
      events.console.push(`${msg.type()}: ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    events.pageErrors.push({
      message: String(err),
      stack: err.stack,
    });
  });

  page.on('response', (res) => {
    const url = res.url();
    if (res.status() >= 400) {
      events.failed.push(`${res.status()} ${url}`);
    }
    if (url.includes('/v1/')) {
      events.api.push(`${res.status()} ${url}`);
    }
  });

  await page.goto('/history/?local-playwright=1', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(5000);

  const homeCta = page.getByText(/继续第\d+关|开始游戏|去挑战/).first();

  const homeText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  console.log(JSON.stringify({
    phase: 'home',
    url: page.url(),
    title: await page.title(),
    textSnippet: homeText.slice(0, 400),
    textLength: homeText.length,
    ctaCount: await page.getByText(/继续第\d+关|开始游戏|去挑战/).count(),
    events,
  }, null, 2));

  await expect(page.locator('body')).toContainText(/历史人物猜谜|继续第\d+关|去挑战|Scholar Profile/);

  if (await homeCta.count()) {
    await homeCta.click();
    await page.waitForTimeout(5000);
  }

  const gameText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  console.log(JSON.stringify({
    phase: 'after-click',
    url: page.url(),
    textSnippet: gameText.slice(0, 500),
    textLength: gameText.length,
    hasLevelHud: await page.getByText(/LEVEL \d+/).count(),
    hasFinalGuess: await page.getByText(/最终猜测|Final Guess/).count(),
    hasRemainingQuestions: await page.getByText(/剩余提问次数/).count(),
    hasHint: await page.getByText(/请只提问/).count(),
    events,
  }, null, 2));

  await expect(page.locator('body')).toContainText(/LEVEL \d+|剩余提问次数|QUEST TIP|问答卷轴/);
  expect(events.pageErrors).toEqual([]);
  expect(events.failed).toEqual([]);
});
