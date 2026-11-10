import { test, expect, type BrowserContext, type Page } from '@playwright/test';
const uid='11111111-1111-4111-8111-111111111111';
const user={id:uid,email:'sync@example.com',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock`;
test('separate devices sync goals, preserve service data, reject stale writes, merge local backup and sign out',async({browser})=>{
 test.skip(!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_PUBLISHABLE_KEY,'requires public configuration for intercepted Supabase requests');
 const entry={id:'original-service',user_id:uid,service_date:'2026-01-01',service_type:'편지',minutes:30,note:'봉사 보존',updated_at:'initial'};
 let failSave=false;
 let row:any={revision:1,document:{version:1,entries:[entry],settings:[],future:{preserve:true}}};
 async function mock(context:BrowserContext){
  await context.routeWebSocket('**/realtime/v1/websocket**',()=>{});
  await context.route('**/auth/v1/**',route=>route.fulfill({json:route.request().url().includes('/token')?{access_token:token,token_type:'bearer',expires_in:3600,refresh_token:'mock-refresh',user}:{}}));
  await context.route('**/rest/v1/personal_journals**',route=>{
   const req=route.request();if(req.method()==='GET')return route.fulfill({json:row?[row]:[]});
   if(failSave)return route.fulfill({status:503,json:{message:'offline'}});
   const input=req.postDataJSON();
   if(req.method()==='PATCH' && new URL(req.url()).searchParams.get('revision')!==`eq.${row.revision}`)return route.fulfill({json:[]});
   row={...row,...input};return route.fulfill({json:[{revision:row.revision}]});
  });
 }
 async function login(page:Page){
  await page.goto('/?cloud=1#/goals');
  await page.getByRole('button',{name:'로그인하고 동기화'}).click();
  const d=page.getByRole('dialog');await d.locator('input[name=email]').fill(user.email);await d.locator('input[name=password]').fill('test-password');
  await d.getByRole('button',{name:'로그인',exact:true}).click();
  await expect(page.getByRole('button',{name:'목표 설정 저장'})).toBeEnabled();
  await expect(page.locator('.connection-banner')).toContainText('목표와 날짜별 평가를 공유');
 }
 const a=await browser.newContext(),b=await browser.newContext();
 try{
  await mock(a);await mock(b);const pc=await a.newPage(),phone=await b.newPage();
  await login(pc);await login(phone);
  await pc.getByLabel('수행일 수').fill('60');await pc.getByRole('button',{name:'목표 설정 저장'}).click();
  await expect(pc.getByTestId('goal-position')).toHaveText('0 / 60칸');
  await pc.getByLabel('평가 날짜').fill('2026-01-01');await pc.getByRole('button',{name:'＋ 잘 지켰어요'}).click();
  await expect(pc.getByTestId('goal-position')).toHaveText('1 / 60칸');
  failSave=true;
  await pc.getByLabel('평가 날짜').fill('2026-01-03');await pc.getByRole('button',{name:'＋ 잘 지켰어요'}).click();
  await expect(pc.getByRole('alert')).toContainText('온라인 저장에 실패');
  expect(row.document.goals.ratings['2026-01-03']).toBeUndefined();failSave=false;
  expect(row.document.entries).toEqual([entry]);expect(row.document.future).toEqual({preserve:true});
  await phone.getByRole('button',{name:'온라인 목표 새로고침'}).click();await expect(phone.getByTestId('goal-position')).toHaveText('1 / 60칸');
  await phone.getByLabel('평가 날짜').fill('2026-01-01');await phone.getByRole('button',{name:'스테이 유지했어요'}).click();await expect(phone.getByTestId('goal-position')).toHaveText('0 / 60칸');
  await pc.getByLabel('평가 날짜').fill('2026-01-02');await pc.getByRole('button',{name:'＋ 잘 지켰어요'}).click();
  await expect(pc.getByRole('alert')).toContainText('다른 기기');
  expect(row.document.goals.ratings['2026-01-02']).toBeUndefined();
  await pc.getByRole('button',{name:'온라인 목표 새로고침'}).click();await expect(pc.getByTestId('goal-position')).toHaveText('0 / 60칸');
  const local=JSON.stringify({version:1,title:'이전 기기 목표',days:30,ratings:{'2026-01-01':-1,'2026-01-02':1}});
  await pc.evaluate(value=>localStorage.setItem('chagok.goals.v1',value),local);
  await pc.getByRole('button',{name:'이 기기의 이전 목표 기록 가져오기'}).click();
  await expect(pc.getByTestId('goal-position')).toHaveText('1 / 60칸');
  expect(row.document.goals.ratings).toEqual({'2026-01-01':0,'2026-01-02':1});
  expect(await pc.evaluate(()=>localStorage.getItem('chagok.goals.v1'))).toBe(local);
  // Editing a service entry must retain the whole goal document.
  const goals=structuredClone(row.document.goals);
  await pc.getByRole('link',{name:'나의 봉사 기록',exact:true}).click();
  await pc.getByRole('button',{name:'봉사 기록하기',exact:true}).click();await pc.getByRole('button',{name:'기록 저장',exact:true}).click();
  await expect(pc.getByRole('dialog')).not.toBeVisible();expect(row.document.goals).toEqual(goals);expect(row.document.entries).toHaveLength(2);
  await pc.getByRole('button',{name:'로그아웃',exact:true}).click();await pc.getByRole('link',{name:'나의 목표 보드',exact:true}).click();
  await expect(pc.getByRole('button',{name:'로그인하고 동기화'})).toBeVisible();
  await expect(pc.getByLabel('목표 이름')).toHaveValue('이전 기기 목표');
 }finally{await a.close();await b.close();}
});
