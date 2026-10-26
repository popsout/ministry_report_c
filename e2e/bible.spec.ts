import {test,expect} from '@playwright/test';
import {available,event,mock,login} from './helpers/bible';
test.describe('관리자 성경 읽기 - 모의 서버',()=>{
 test.skip(!available,'모의 인증에는 공개 클라이언트 설정이 필요합니다');
 test('비관리자는 사용자 metadata를 바꿔도 사건을 조회하지 않는다',async({context,page})=>{
  await mock(context,false);let queries=0;page.on('request',r=>{if(r.url().includes('/bible_reading_events'))queries++;});
  await login(page);await expect(page.getByRole('heading',{name:'관리자에게만 열린 공간입니다'})).toBeVisible();
  await expect(page.getByText(event.summary)).toHaveCount(0);expect(queries).toBe(0);
 });
 test('왕과 병행 성구를 통합하고 암호화 서가를 오프라인에서 열며 잘못된 암호를 거부한다',async({context,page})=>{
  await page.setViewportSize({width:360,height:800});await mock(context);await login(page);
  await page.getByRole('button',{name:/통일 왕국/}).click();
  await expect(page.getByRole('heading',{name:event.title})).toBeVisible();
  await expect(page.locator('.event-date')).toContainText('솔로몬 제4년 착공');
  await expect(page.locator('.event-date')).toContainText('PDF 성구 대조');
  await page.getByText('PDF 원문 대조 기록 (1건)',{exact:true}).click();await expect(page.locator('.pdf-check')).toContainText('전체 PDF 474쪽');await expect(page.locator('.pdf-check')).toContainText('절대연도는 확인하지 않음');
  await page.getByText('연대의 근거와 확실성',{exact:true}).click();await expect(page.locator('.chronology-source').filter({has:page.getByText('연대의 근거와 확실성',{exact:true})})).toContainText('열왕기상 6:1');
  await expect(page.getByLabel('당시 나라와 통치자')).toContainText('솔로몬');await expect(page.locator('.passage-list')).toContainText('역대기하 2–7장');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'이 기기에 저장',exact:true}).click();
  await page.locator('input[name=vaultPassword]').fill('local-secret-123');await page.locator('input[name=vaultConfirm]').fill('local-secret-123');
  await page.getByRole('button',{name:'암호화하여 저장'}).click();await expect(page.getByRole('status')).toContainText('암호화 저장');
  const stored=await page.evaluate(async()=>{
   const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('chagok-private-reading');r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
   return new Promise<string>((resolve,reject)=>{const r=db.transaction('vaults').objectStore('vaults').getAll();r.onsuccess=()=>{resolve(JSON.stringify(r.result));db.close();};r.onerror=reject;});
  });
  expect(stored).not.toContain(event.summary);expect(stored).not.toContain('local-secret-123');expect(stored).toContain('ciphertext');
  await context.setOffline(true);await expect(page.getByRole('heading',{name:'저장된 서가 열기'})).toBeVisible();
  await page.locator('input[name=unlockPassword]').fill('incorrect-password');await page.getByRole('button',{name:'서가 열기',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('암호가 다르거나');
  await page.locator('input[name=unlockPassword]').fill('local-secret-123');await page.getByRole('button',{name:'서가 열기',exact:true}).click();
  await expect(page.getByText(event.summary)).toBeVisible();
  await expect(page.locator('.passage-list a')).toHaveCount(0);
  await page.getByRole('button',{name:'서가 잠그기'}).click();await expect(page.getByText(event.summary)).toHaveCount(0);
  await context.setOffline(false);
 });
 test('계산한 연대는 출판물의 직접 표기와 구분한다',async({context,page})=>{
  await mock(context);await context.route('**/rest/v1/bible_reading_events**',r=>r.fulfill({json:[{...event,chronology:{...event.chronology,label:'연수 계산 결과',basis_type:'calculation'}}]}));
  await login(page);await page.getByRole('button',{name:/통일 왕국/}).click();
  await expect(page.locator('.event-date')).toContainText('근거 대조·연수 계산');
  await page.getByText('연대의 근거와 확실성',{exact:true}).click();await expect(page.locator('.chronology-source').filter({has:page.getByText('연대의 근거와 확실성',{exact:true})})).toContainText('출처에 같은 결과값이 직접 적혀 있다는 뜻은 아니며');
 });
 test('로그아웃하면 서가도 삭제하고 화면을 잠근다',async({context,page})=>{
  await page.setViewportSize({width:390,height:844});
  await mock(context);await login(page);await page.getByRole('button',{name:'이 기기에 저장',exact:true}).click();
  await page.locator('input[name=vaultPassword]').fill('local-secret-123');await page.locator('input[name=vaultConfirm]').fill('local-secret-123');await page.getByRole('button',{name:'암호화하여 저장'}).click();await expect(page.getByRole('status')).toContainText('암호화 저장');
  await page.locator('.mobile-sections a[href="#calendar"]').click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await expect(page.locator('.sync')).toContainText('로그인 필요');
  await page.locator('.mobile-sections a[href="#/bible"]').click();await expect(page.getByRole('button',{name:'기존 계정으로 로그인'})).toBeVisible();
  await context.setOffline(true);await expect(page.getByText('이 기기에 저장된 자료가 없습니다.',{exact:false})).toBeVisible();
 });
});
test('단독 HTML과 미리보기 경로에는 관리자 콘텐츠가 없다',async({page})=>{
 await page.goto('/?preview=1#/bible');await expect(page.getByRole('heading',{name:'성경 읽기 기능을 준비하고 있어요'})).toBeVisible();await expect(page.locator('.era-card')).toHaveCount(0);
});
