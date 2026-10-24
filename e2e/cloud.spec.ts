import {test,expect,type BrowserContext,type Page} from '@playwright/test';
const available=!!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const uid='11111111-1111-4111-8111-111111111111';
const user={id:uid,email:'test@example.com',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
const encoded=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=`${encoded({alg:'HS256',typ:'JWT'})}.${encoded({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock-signature`;
test.describe('온라인 저장 - 모의 서버',()=>{
 test.skip(!available,'프로젝트 공개 연결 정보가 있는 환경에서 모의 인증 실행');
 test('별도 브라우저의 로그인·저장·재조회·동시 수정 충돌·로그아웃',async({browser})=>{
  let row:{revision:number;document:unknown}|null=null;
  async function mock(context:BrowserContext){
   await context.routeWebSocket('**/realtime/v1/websocket**',()=>{});
   await context.route('**/auth/v1/**',route=>{
    if(route.request().url().includes('/token'))return route.fulfill({json:{access_token:token,token_type:'bearer',expires_in:3600,refresh_token:'mock-refresh',user}});
    return route.fulfill({json:{}});
   });
   await context.route('**/rest/v1/personal_journals**',async route=>{
    const request=route.request();
    if(request.method()==='GET')return route.fulfill({json:row?[row]:[]});
    const input=request.postDataJSON();
    if(request.method()==='POST'){
     if(row)return route.fulfill({status:409,json:{code:'23505',message:'conflict'}});
     row=input;return route.fulfill({json:[{revision:input.revision}]});
    }
    const expected=new URL(request.url()).searchParams.get('revision');
    if(!row || expected!==`eq.${row.revision}`)return route.fulfill({json:[]});
    row=input;return route.fulfill({json:[{revision:input.revision}]});
   });
  }
  async function login(page:Page){
   await page.goto('http://127.0.0.1:5174/?cloud=1');
   await page.getByRole('button',{name:'로그인',exact:true}).click();
   await page.getByRole('dialog').locator('input[name=email]').fill('test@example.com');
   await page.getByRole('dialog').locator('input[name=password]').fill('test-password');
   await page.getByRole('dialog').getByRole('button',{name:'로그인',exact:true}).click();
   await expect(page.getByRole('button',{name:'봉사 기록하기',exact:true})).toBeEnabled();
  }
  const a=await browser.newContext(), b=await browser.newContext({viewport:{width:360,height:800}});await mock(a);await mock(b);
  const pc=await a.newPage(),phone=await b.newPage();await login(pc);await login(phone);
  await expect(pc.locator('.welcome-message')).toHaveText('test 님 환영합니다');
  await expect(phone.locator('.welcome-message')).toHaveText('test 님 환영합니다');
  expect(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await pc.getByRole('button',{name:'봉사 기록하기',exact:true}).click();await pc.getByRole('button',{name:'기록 저장',exact:true}).click();
  await expect(pc.getByRole('dialog')).not.toBeVisible();
  await phone.getByRole('button',{name:'새로고침',exact:true}).click();await expect(phone.locator('.summary-card').first()).toContainText('2시간');
  await phone.locator('.day[aria-pressed=true]').click();await phone.locator('.entry-row').click();
  await phone.getByRole('combobox',{name:'시간',exact:true}).selectOption('3');await phone.getByRole('button',{name:'기록 저장',exact:true}).click();
  await expect(phone.locator('.entry-row')).toContainText('3시간');
  // PC is still on revision 1; it must not overwrite revision 2.
  await pc.getByRole('button',{name:'봉사 기록하기',exact:true}).click();await pc.getByRole('button',{name:'기록 저장',exact:true}).click();
  await expect(pc.getByRole('dialog').getByRole('alert')).toContainText('다른 기기');
  await pc.getByRole('button',{name:'닫기',exact:true}).click();await pc.getByRole('button',{name:'새로고침',exact:true}).click();
  await expect(pc.locator('.summary-card').first()).toContainText('3시간');
  await pc.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(pc.locator('.summary-card').first()).toContainText('0시간');
  await expect(pc.locator('.welcome-message')).toHaveCount(0);
  await a.close();await b.close();
 });
});
