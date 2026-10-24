import { test, expect } from '@playwright/test';
const configured=!!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
test.describe('Google 로그인 연결 (인증 서버 모의 응답)',()=>{
 test.skip(!configured,'온라인 설정이 있는 환경에서 실행');
 test('설정 미완료 상태에서 외부 오류 화면으로 이동하지 않는다',async({page})=>{
  await page.route('**/auth/v1/settings',route=>route.fulfill({json:{external:{google:false}}}));
  await page.goto('/');
  await page.getByRole('button',{name:'구글로 로그인',exact:true}).click();
  await expect(page.getByRole('dialog').getByText('별도 회원가입이나 앱 비밀번호는 필요하지 않아요.',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Google 계정으로 계속하기'}).click();
  await expect(page.getByRole('alert')).toContainText('아직 준비되지 않았습니다');
  await expect(page).toHaveURL('http://127.0.0.1:5174/');
 });
 test('Google OAuth 시작 요청에 PKCE와 복귀 주소를 포함한다',async({page})=>{
  await page.route('**/auth/v1/settings',route=>route.fulfill({json:{external:{google:true}}}));
  let oauth:URL|undefined;
  await page.route('**/auth/v1/authorize?**',route=>{oauth=new URL(route.request().url());return route.fulfill({contentType:'text/html',body:'<h1>OAuth request captured</h1>'});});
  await page.goto('/');await page.getByRole('button',{name:'구글로 로그인',exact:true}).click();
  await page.getByRole('button',{name:'Google 계정으로 계속하기'}).click();
  await expect(page.getByRole('heading',{name:'OAuth request captured'})).toBeVisible();
  expect(oauth!.searchParams.get('provider')).toBe('google');
  expect(oauth!.searchParams.get('redirect_to')).toBe('http://127.0.0.1:5174/');
  expect(oauth!.searchParams.get('code_challenge')).toBeTruthy();
  expect(oauth!.searchParams.get('code_challenge_method')).toBe('s256');
 });
 test('인증 취소 후 안내를 보여주고 주소의 오류 내용을 정리한다',async({page})=>{
  await page.goto('/?error=access_denied&error_description=private');
  await expect(page.getByRole('alert')).toContainText('취소');
  await expect(page).toHaveURL('http://127.0.0.1:5174/');
 });
 test('온라인 화면에서도 인증 없이 예시 UI를 확인할 수 있다',async({page})=>{
  await page.goto('/');await page.getByRole('link',{name:'예시 화면 보기'}).click();
  await expect(page.locator('.connection-banner')).toContainText('화면 미리보기');
  await expect(page.locator('.summary-card').first()).toContainText('12');
  await expect(page.getByRole('link',{name:'실제 기록장으로'})).toBeVisible();
 });
});
