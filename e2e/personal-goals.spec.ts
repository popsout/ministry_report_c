import { test, expect } from '@playwright/test';
test('goal settings, replacement ratings, failure notice and journal preservation', async ({ page }) => {
 await page.goto('/?device=1');
 await page.evaluate(() => localStorage.setItem('chagok.journal.v1', JSON.stringify({version:1,entries:[],settings:[]})));
 const original = await page.evaluate(() => localStorage.getItem('chagok.journal.v1'));
 await page.getByLabel('수행일 수').fill('3');
 await page.getByRole('button', {name:'목표 설정 저장'}).click();
 await expect(page.locator('.journey-cells li')).toHaveCount(4);
 await page.getByLabel('평가 날짜').fill('2026-01-01');
 await page.getByRole('button', {name:'＋ 잘 지켰어요'}).click();
 await page.getByRole('button', {name:'＋ 잘 지켰어요'}).click();
 await expect(page.getByTestId('goal-position')).toHaveText('1 / 3칸');
 await page.getByRole('button', {name:'스테이 유지했어요'}).click();
 await expect(page.getByTestId('goal-position')).toHaveText('0 / 3칸');
 for (const date of ['2026-01-01','2026-01-02','2026-01-03']) {
  await page.getByLabel('평가 날짜').fill(date);
  await page.getByRole('button', {name:'－ 아쉬웠어요'}).click();
 }
 await expect(page.locator('.failure-notice.firm')).toContainText('누적 3일');
 await page.reload();
 await expect(page.getByLabel('수행일 수')).toHaveValue('3');
 await expect(page.locator('.failure-notice')).toContainText('누적 3일');
 expect(await page.evaluate(() => localStorage.getItem('chagok.journal.v1'))).toBe(original);
 await page.getByRole('link', {name:'나의 봉사 기록',exact:true}).click();
 await expect(page.getByRole('heading', {name:'봉사 캘린더'})).toBeVisible();
});
test('timer presets, pause, resume, completion and reset', async ({ page }) => {
 await page.clock.install();
 await page.goto('/?device=1');
 const timer = page.getByRole('timer');
 await expect(timer).toHaveText('01:30');
 await page.getByRole('button', {name:'2분',exact:true}).click();
 await expect(timer).toHaveText('02:00');
 await page.getByRole('button', {name:'3분',exact:true}).click();
 await expect(timer).toHaveText('03:00');
 await page.getByRole('button', {name:'시작',exact:true}).click();
 await page.clock.fastForward(10000);
 await expect(timer).toHaveText('02:50');
 await page.getByRole('button', {name:'일시정지'}).click();
 await page.clock.fastForward(10000);
 await expect(timer).toHaveText('02:50');
 await page.getByRole('button', {name:'계속',exact:true}).click();
 await page.clock.fastForward(170000);
 await expect(page.getByText('휴식 끝! 준비됐다면 다음 세트를 시작하세요.')).toBeVisible();
 await page.getByRole('button', {name:'초기화',exact:true}).click();
 await expect(timer).toHaveText('03:00');
});
test('mobile fits viewport and corrupted goal data remains untouched', async ({page}) => {
 await page.setViewportSize({width:390,height:844});
 await page.goto('/?device=1');
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.evaluate(() => localStorage.setItem('chagok.goals.v1','broken'));
 await page.reload();
 await expect(page.getByRole('alert')).toContainText('기존 데이터는 보존');
 await page.getByRole('button', {name:'＋ 잘 지켰어요'}).click();
 expect(await page.evaluate(() => localStorage.getItem('chagok.goals.v1'))).toBe('broken');
});
