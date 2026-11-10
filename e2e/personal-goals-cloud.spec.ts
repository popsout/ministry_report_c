import { test, expect, type BrowserContext, type Page } from '@playwright/test';
const available = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const encoded = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
const rows = new Map<string, { document: any; revision: number }>();
const journal = { version: 1, entries: [{ id: 'keep', user_id: A, service_date: '2026-11-10', service_type: '호별', minutes: 120, note: '기존 봉사 기록', updated_at: 'old' }], settings: [] };
async function mock(context: BrowserContext, uid: string, missing = false) {
  const user = { id: uid, email: `${uid === A ? 'first' : 'second'}@example.com`, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() };
  const token = `${encoded({ alg: 'HS256', typ: 'JWT' })}.${encoded({ sub: uid, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.mock`;
  await context.routeWebSocket('**/realtime/v1/websocket**', () => {});
  await context.route('**/auth/v1/**', route => route.fulfill({ json: route.request().url().includes('/token') ? { access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: 'mock-refresh', user } : {} }));
  await context.route('**/rest/v1/personal_journals**', route => {
    expect(route.request().method()).toBe('GET');
    return route.fulfill({ json: [{ document: journal, revision: 1 }] });
  });
  await context.route('**/rest/v1/personal_goals**', route => {
    const req = route.request(), url = new URL(req.url());
    expect(url.searchParams.get('user_id') || req.postDataJSON()?.user_id).toBe(req.method() === 'POST' ? uid : `eq.${uid}`);
    if (missing) return route.fulfill({ status: 404, json: { code: 'PGRST205', message: 'missing table' } });
    const row = rows.get(uid);
    if (req.method() === 'GET') return route.fulfill({ json: row ? [row] : [] });
    const data = req.postDataJSON();
    if (req.method() === 'POST' && row) return route.fulfill({ status: 409, json: { code: '23505' } });
    if (req.method() === 'PATCH' && url.searchParams.get('revision') !== `eq.${row?.revision}`) return route.fulfill({ json: [] });
    rows.set(uid, { document: data.document, revision: data.revision });
    return route.fulfill({ json: [{ revision: data.revision }] });
  });
}
async function login(page: Page) {
  await page.goto('/?cloud=1#/goals'); await page.getByRole('button', { name: '로그인', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.locator('[name=email]').fill('test@example.com'); await dialog.locator('[name=password]').fill('app-test-password');
  await dialog.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('button', { name: '로그아웃', exact: true })).toBeVisible();
}
test.describe('새 목표 온라인 동기화 · 모의 서버', () => {
  test.skip(!available, '모의 클라이언트 연결 설정 필요');
  test.beforeEach(() => rows.clear());
  test('PC·휴대폰 공유·수정 충돌·다른 계정 분리·봉사 기록 보존', async ({ browser }) => {
    const pcContext = await browser.newContext(), phoneContext = await browser.newContext({ viewport: { width: 360, height: 800 } }), otherContext = await browser.newContext();
    await mock(pcContext, A); await mock(phoneContext, A); await mock(otherContext, B);
    const pc = await pcContext.newPage(), phone = await phoneContext.newPage(), other = await otherContext.newPage();
    await login(pc); await pc.getByRole('button', { name: '목표 저장', exact: true }).click();
    await expect(pc.getByRole('heading', { name: '첫 목표 설정' })).toHaveCount(0);
    await login(phone); await expect(phone.locator('.journey-heading')).toContainText('나의 식단 실천');
    await phone.getByRole('button', { name: '＋ 업', exact: true }).click(); await expect(phone.getByTestId('goal-position')).toHaveText('1');
    // PC still has the revision from before the phone's change; no focus/realtime event is simulated.
    await pc.getByRole('button', { name: '－ 다운', exact: true }).click(); await expect(pc.locator('.goal-feedback')).toContainText('다른 기기나 탭');
    await pc.getByRole('button', { name: '새로고침', exact: true }).click(); await expect(pc.getByTestId('goal-position')).toHaveText('1');
    await login(other); await expect(other.getByRole('heading', { name: '첫 목표 설정' })).toBeVisible(); await expect(other.getByTestId('goal-position')).toHaveText('0');
    await pc.goto('/?cloud=1#calendar'); await expect(pc.locator('.summary-card').first()).toContainText('2시간');
    await phone.getByRole('button', { name: '로그아웃', exact: true }).click(); await expect(phone.getByTestId('goal-position')).toHaveText('0'); await expect(phone.locator('.history-list')).toHaveCount(0);
    await pcContext.close(); await phoneContext.close(); await otherContext.close();
  });
  test('로그아웃 뒤 지연된 목표 응답이 개인 기록을 다시 표시하지 않는다', async ({ context, page }) => {
    await mock(context, A);
    let release!: () => void, started!: () => void;
    const waiting = new Promise<void>(resolve => { started = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    await context.route('**/rest/v1/personal_goals**', async route => {
      started(); await gate;
      await route.fulfill({ json: [{ revision: 1, document: { version: 1, plan: { title: '비공개 목표 응답', targetDays: 60, startDate: '2026-11-01', action: '개인 계획' }, evaluations: { '2026-11-10': 'up' }, dismissedOn: null } }] });
    });
    await login(page); await waiting;
    await page.getByRole('button', { name: '로그아웃', exact: true }).click();
    await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
    release();
    await expect(page.getByTestId('goal-position')).toHaveText('0');
    await expect(page.getByText('비공개 목표 응답', { exact: true })).toHaveCount(0);
  });
  test('새 테이블이 없으면 로컬로 자동 저장하지 않고 기존 봉사 화면은 유지한다', async ({ context, page }) => {
    await mock(context, A, true); await login(page);
    await expect(page.getByRole('alert')).toContainText('personal_goals');
    await expect(page.getByRole('button', { name: '＋ 업', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => localStorage.getItem('chagok.goals.v1'))).toBeNull();
    await page.goto('/?cloud=1#calendar'); await expect(page.locator('.summary-card').first()).toContainText('2시간');
  });
});
