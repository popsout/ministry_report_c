import type {BrowserContext,Page} from '@playwright/test';
export const available=!!(process.env.VITE_SUPABASE_URL&&process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const uid='11111111-1111-4111-8111-111111111111';
const user={id:uid,email:'reader@example.com',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{admin:true},created_at:new Date().toISOString()};
const encoded=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=`${encoded({alg:'HS256',typ:'JWT'})}.${encoded({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.test`;
export const event={id:'temple',era_id:'united',era_title:'통일 왕국',era_order:5,event_order:1,title:'성전 건축과 봉헌',summary:'서버에서만 받은 비공개 사건 요약입니다.',rulers:[{nation:'이스라엘',name:'솔로몬'},{nation:'티레',name:'히람'}],prophets:[],passages:[{reference:'열왕기상 5–8장',note:'성전 건축과 봉헌'},{reference:'역대기하 2–7장',note:'병행 기록'}],related_books:[],placement_note:'사건별 대응 검토 중',chronology:{label:'기원전 11세기경(추정)',precision:'approximate',basis:'솔로몬 통치기, 출판물 대조 전',references:['열왕기상 6:1'],reviewed:false},review_status:'draft'};
export async function mock(context:BrowserContext,allowed=true){
 await context.routeWebSocket('**/realtime/v1/websocket**',()=>{});
 await context.route('**/auth/v1/**',route=>route.fulfill({json:route.request().url().includes('/token')?{access_token:token,token_type:'bearer',expires_in:3600,refresh_token:'mock-refresh',user}:{}}));
 await context.route('**/rest/v1/personal_journals**',route=>route.fulfill({json:[]}));
 await context.route('**/rest/v1/rpc/is_bible_admin',route=>route.fulfill({json:allowed}));
 await context.route('**/rest/v1/bible_reading_events**',route=>route.fulfill({json:allowed?[event]:[]}));
}
export async function login(page:Page){
 await page.goto('/?cloud=1#/bible');await page.getByRole('button',{name:'기존 계정으로 로그인'}).click();
 await page.getByRole('dialog').locator('input[name=email]').fill('reader@example.com');await page.getByRole('dialog').locator('input[name=password]').fill('app-password');
 await page.getByRole('dialog').getByRole('button',{name:'로그인',exact:true}).click();
}
