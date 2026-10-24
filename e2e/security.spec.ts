import {test,expect,type BrowserContext,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const available=!!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const uid='11111111-1111-4111-8111-111111111111';
const encoded=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=`${encoded({alg:'HS256',typ:'JWT'})}.${encoded({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock`;
const user={id:uid,email:'security-test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
async function mockAuth(context:BrowserContext,onPassword?:(url:string,body:Record<string,unknown>)=>void){
 await context.routeWebSocket('**/realtime/v1/websocket**',()=>{});
 await context.route('**/auth/v1/**',route=>{
  if(route.request().url().includes('/token')){
   onPassword?.(route.request().url(),route.request().postDataJSON());
   return route.fulfill({json:{access_token:token,refresh_token:'mock-refresh',token_type:'bearer',expires_in:3600,user}});
  }
  return route.fulfill({json:{}});
 });
}
async function login(page:Page,password='Unique-app-test-password!'){
 await page.goto('/?cloud=1');await page.getByRole('button',{name:'로그인',exact:true}).click();
 const d=page.getByRole('dialog');await d.locator('input[name=email]').fill(user.email);await d.locator('input[name=password]').fill(password);
 await d.getByRole('button',{name:'로그인',exact:true}).click();await expect(page.getByRole('button',{name:'로그아웃',exact:true})).toBeVisible();
}
test('단일 HTML의 CSP는 삽입 스크립트를 차단하고 메모를 HTML로 실행하지 않는다',async({page})=>{
 await page.route('**/secured.html',route=>route.fulfill({contentType:'text/html',body:readFileSync(resolve('release/chagok.html'),'utf8')}));
 await page.goto('/secured.html');await expect(page.getByRole('heading',{level:1})).toHaveText('My Ministry Journal');
 await page.evaluate(()=>{
  const s=document.createElement('script');s.textContent='window.__injected=true';document.head.append(s);
 });
 expect(await page.evaluate(()=>('__injected' in window))).toBe(false);
 await page.getByRole('button',{name:'봉사 기록하기',exact:true}).click();
 const attack='<img src=x onerror="window.__noteInjected=true">';await page.getByRole('dialog').locator('textarea').fill(attack);
 await page.getByRole('button',{name:'기록 저장',exact:true}).click();await page.locator('.day[aria-pressed=true]').click();
 await expect(page.locator('.entry-row small')).toHaveText(attack);await expect(page.locator('.entry-row img')).toHaveCount(0);
 expect(await page.evaluate(()=>('__noteInjected' in window))).toBe(false);
});
test.describe('인증 보안 - 모의 서버',()=>{
 test.skip(!available,'프로젝트 공개 연결 정보가 있는 환경에서 모의 인증 실행');
 test('비밀번호는 프로젝트 HTTPS 인증 경로로만 전송되고 앱 저장소에 보관되지 않는다',async({page,context})=>{
  let destination='';const secret='Unique-app-test-password!';let received='';
  await mockAuth(context,(url,body)=>{destination=url;received=String(body.password);});
  await context.route('**/rest/v1/personal_journals**',route=>route.fulfill({json:[]}));
  await login(page,secret);expect(received).toBe(secret);
  const expected=new URL(process.env.VITE_SUPABASE_URL!);const actual=new URL(destination);
  expect(actual.protocol).toBe('https:');expect(actual.origin).toBe(expected.origin);expect(actual.pathname).toBe('/auth/v1/token');expect(actual.search).not.toContain(secret);
  expect(await page.evaluate(value=>[...Object.values(localStorage),...Object.values(sessionStorage)].some(v=>v.includes(value)),secret)).toBe(false);
 });
 test('다른 탭에서 로그아웃하면 편집 내용을 숨기고 지연된 저장 응답으로 복원하지 않는다',async({context})=>{
  await mockAuth(context);
  let release!:()=>void, start!:()=>void;
  const waiting=new Promise<void>(resolve=>{start=resolve;});
  const date=new Date();const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const record={id:'security-entry',user_id:uid,service_date:key,service_type:'호별',minutes:120,note:'private-test-note',updated_at:'initial'};
  await context.route('**/rest/v1/personal_journals**',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:[{revision:1,document:{version:1,entries:[record],settings:[]}}]});
   start();await new Promise<void>(resolve=>{release=resolve;});return route.fulfill({json:[{revision:2}]});
  });
  const pc=await context.newPage();await login(pc);
  await expect(pc.locator('.summary-card').first()).toContainText('2시간');
  const other=await context.newPage();await other.goto('/?cloud=1');await expect(other.getByRole('button',{name:'로그아웃',exact:true})).toBeVisible();
  await pc.locator('.day[aria-pressed=true]').click();await pc.locator('.entry-row').click();
  await pc.getByRole('button',{name:'기록 저장',exact:true}).click();await waiting;
  await other.getByRole('button',{name:'로그아웃',exact:true}).click();
  await expect(pc.getByRole('dialog')).not.toBeVisible();await expect(pc.locator('.summary-card').first()).toContainText('0시간');
  release();await expect(pc.getByRole('alert')).toContainText('로그인 상태가 변경');
  await expect(pc.locator('.summary-card').first()).toContainText('0시간');await expect(pc.locator('body')).not.toContainText('private-test-note');
 });
 test('가입 화면에서 구글 비밀번호와 다른 새 비밀번호임을 명시한다',async({page,context})=>{
  await mockAuth(context);await page.goto('/?cloud=1');await page.getByRole('button',{name:'로그인',exact:true}).click();
  const d=page.getByRole('dialog');await expect(d).toContainText('구글 비밀번호 대신');await d.getByRole('button',{name:'처음이라면 계정 만들기'}).click();
  await expect(d.locator('input[name=password]')).toHaveAttribute('autocomplete','new-password');await expect(d.locator('input[name=password]')).toHaveAttribute('minlength','8');
  await expect(d.locator('input[name=passwordConfirm]')).toBeVisible();
  let submitted=false;
  await context.route('**/auth/v1/signup**',route=>{submitted=true;return route.fulfill({json:{user,session:null}});});
  await d.locator('input[name=email]').fill('security-test@example.com');
  await d.locator('input[name=password]').fill('abc1234');await d.locator('input[name=passwordConfirm]').fill('abc1234');
  await d.getByRole('button',{name:'내 기록장 계정 만들기'}).click();expect(submitted).toBe(false);
  await d.locator('input[name=password]').fill('abc12345');await d.locator('input[name=passwordConfirm]').fill('abc12345');
  await d.getByRole('button',{name:'내 기록장 계정 만들기'}).click();
  await expect(d.getByRole('status')).toContainText('인증 메일');expect(submitted).toBe(true);

 });
});
