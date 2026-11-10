import { test, expect } from '@playwright/test';
const today = '2026-11-10';
async function setup(page: import('@playwright/test').Page, target = '3') {
  await page.goto('/#/goals');
  await page.getByLabel('목표 수행일 수', { exact: true }).fill(target);
  await page.getByLabel('시작일', { exact: true }).fill('2026-11-01');
  await page.getByRole('button', { name: '목표 저장', exact: true }).click();
  await expect(page.getByRole('heading', { name: '첫 목표 설정' })).toHaveCount(0);
}
test.beforeEach(async ({ page }) => { await page.clock.install({ time: new Date('2026-11-10T03:00:00Z') }); });
test('휴대폰의 날짜별 수정·경계·미기록일·봉사 기록 보존', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const journal = JSON.stringify({ version: 1, entries: [{ id: 'a', user_id: 'local', service_date: today, service_type: '호별', minutes: 120, note: '보존할 봉사 기록', updated_at: 'old' }], settings: [] });
  await page.addInitScript(value => { if (!localStorage.getItem('chagok.journal.v1')) localStorage.setItem('chagok.journal.v1', value); }, journal);
  await setup(page);
  const up = page.getByRole('button', { name: '＋ 업', exact: true }), down = page.getByRole('button', { name: '－ 다운', exact: true });
  await page.getByLabel('평가 날짜').fill('2026-11-01'); await down.click();
  await expect(page.getByTestId('goal-position')).toHaveText('0');
  await page.getByLabel('평가 날짜').fill('2026-11-02'); await up.click(); await up.click();
  await expect(page.getByTestId('goal-position')).toHaveText('1');
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('chagok.goals.v1')!).evaluations).length)).toBe(2);
  await page.getByLabel('평가 날짜').fill('2026-11-01'); await up.click();
  await expect(page.getByTestId('goal-position')).toHaveText('2');
  await page.getByLabel('평가 날짜').fill(today); await up.click(); await expect(page.getByTestId('goal-position')).toHaveText('3');
  await expect(page.getByText('설정한 수행 목표에 도착했어요.', { exact: false })).toBeVisible();
  await page.reload(); await expect(page.getByTestId('goal-position')).toHaveText('3');
  expect(await page.evaluate(() => localStorage.getItem('chagok.journal.v1'))).toBe(journal);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/#calendar'); await expect(page.locator('.summary-card').first()).toContainText('2시간');
});
test('시각 경보의 실제 계획 조정·오늘 닫기와 손상 데이터 보호', async ({ page }) => {
  await setup(page);
  for (const date of ['2026-11-08', '2026-11-09', today]) { await page.getByLabel('평가 날짜').fill(date); await page.getByRole('button', { name: '－ 다운', exact: true }).click(); }
  const warning = page.getByRole('region', { name: '실천 흐름 알림' });
  await expect(warning).toContainText('다운 3일 연속');
  await warning.getByRole('button', { name: '계획 조정' }).click();
  await page.getByLabel('실천할 식사 계획').fill('다음 한 끼는 정한 시간에 먹기'); await page.getByRole('button', { name: '목표 저장', exact: true }).click();
  await expect(page.locator('.journey-heading')).toContainText('다음 한 끼는 정한 시간에 먹기');
  await warning.getByRole('button', { name: '오늘 닫기' }).click(); await expect(warning).toHaveCount(0);
  await page.reload(); await expect(warning).toHaveCount(0);
  await page.clock.fastForward(24 * 3600 * 1000); await expect(warning).toBeVisible();
  await page.evaluate(() => localStorage.setItem('chagok.goals.v1', 'broken')); await page.reload();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('chagok.goals.v1'))).toBe('broken');
  await expect(page.getByRole('button', { name: '＋ 업', exact: true })).toBeDisabled();
});
test('오래 열린 계획 편집은 다른 탭의 평가를 덮어쓰지 않는다', async ({ page, context }) => {
  await setup(page); await page.getByRole('button', { name: '계획 조정', exact: true }).click();
  const other = await context.newPage(); await other.clock.install({ time: new Date('2026-11-10T03:00:00Z') }); await other.goto('/#/goals');
  await other.getByRole('button', { name: '＋ 업', exact: true }).click();
  await expect(page.getByTestId('goal-position')).toHaveText('1');
  await page.getByLabel('목표 이름', { exact: true }).fill('오래 열린 수정'); await page.getByRole('button', { name: '목표 저장', exact: true }).click();
  await expect(page.locator('.goal-feedback')).toContainText('다른 기기나 탭');
  await other.reload(); await expect(other.getByTestId('goal-position')).toHaveText('1');
});
test('타이머 일시정지·재개·프리셋 교체·복귀·초기화', async ({ page }) => {
  await page.goto('/#/goals'); const timer = page.locator('.rest-timer');
  await timer.getByRole('button', { name: '1분 30초', exact: true }).click();
  await page.clock.fastForward(30000); await expect(timer.getByRole('timer')).toHaveText('01:00');
  await timer.getByRole('button', { name: '일시정지', exact: true }).click(); await page.clock.fastForward(60000); await expect(timer.getByRole('timer')).toHaveText('01:00');
  await timer.getByRole('button', { name: '재개', exact: true }).click(); await page.clock.fastForward(10000); await expect(timer.getByRole('timer')).toHaveText('00:50');
  await timer.getByRole('button', { name: '2분', exact: true }).click(); await expect(timer.getByRole('timer')).toHaveText('02:00');
  await page.goto('/#calendar'); await page.clock.fastForward(120000); await page.goto('/#/goals');
  await expect(timer.getByRole('timer')).toHaveText('00:00'); await expect(timer.locator('.timer-status')).toContainText('휴식 끝');
  await timer.getByRole('button', { name: '초기화', exact: true }).click(); await expect(timer.getByRole('timer')).toHaveText('02:00');
  await timer.getByRole('button', { name: '3분', exact: true }).click(); await expect(timer.getByRole('timer')).toHaveText('03:00');
});
test('365칸 보드와 감소된 애니메이션은 PC·태블릿·휴대폰에서 넘치지 않는다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await setup(page, '365');
  for (const width of [1440, 820, 360]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
  await page.getByRole('button', { name: '＋ 업', exact: true }).click();
  await expect(page.locator('.bear-action')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.journey-tile')).toHaveCount(366);
});

test('목표 저장 공간 오류는 입력과 봉사 기록을 보존한다', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key === 'chagok.goals.v1') throw new DOMException('full', 'QuotaExceededError'); original.call(this, key, value); };
  });
  await page.goto('/#/goals'); await page.getByLabel('목표 이름', { exact: true }).fill('보존할 목표 입력');
  await page.getByRole('button', { name: '목표 저장', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '목표 기록을 저장하지 못했습니다' })).toBeVisible();
  await expect(page.getByLabel('목표 이름', { exact: true })).toHaveValue('보존할 목표 입력');
  expect(await page.evaluate(() => localStorage.getItem('chagok.goals.v1'))).toBeNull();
});
