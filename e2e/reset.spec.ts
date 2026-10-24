import { test,expect } from '@playwright/test';
async function seed(page:import('@playwright/test').Page){
 await page.clock.setFixedTime(new Date(2026,10,3,12));
 await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('chagok.journal.v1',JSON.stringify({version:1,entries:[
  ['a','2026-11-03',60],['b','2026-11-03',30],['c','2026-11-04',120],['d','2026-12-03',180],['e','2025-11-03',240],
 ].map(([id,service_date,minutes])=>({id,service_date,minutes,user_id:'local',service_type:'호별',note:String(id),updated_at:'initial'})),settings:[{month:'2026-11-01',role:'정규 파이오니아',updated_at:'initial'}]})));
 await page.reload();
}
test('일간 초기화는 선택일에만 적용하고 취소하면 보존한다',async({page})=>{
 await seed(page);await expect(page.locator('.entry-row')).toHaveCount(2);
 page.once('dialog',d=>{expect(d.message()).toContain('2026년 11월 3일');return d.dismiss();});
 await page.getByRole('button',{name:'일간 초기화',exact:true}).click();
 await expect(page.locator('.entry-row')).toHaveCount(2);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'일간 초기화',exact:true}).click();
 await expect(page.locator('.entry-row')).toHaveCount(0);await page.reload();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('chagok.journal.v1')!).entries.map((e:{id:string})=>e.id))).toEqual(['c','d','e']);
 await expect(page.getByRole('button',{name:'일간 초기화',exact:true})).toBeDisabled();
 await expect(page.getByRole('combobox',{name:'이 달의 파이오니아 신분'})).toHaveValue('정규 파이오니아');
});
test('월간 초기화는 같은 연월만 삭제하고 신분과 다른 달·연도는 보존한다',async({page})=>{
 await seed(page);page.once('dialog',d=>{expect(d.message()).toContain('2026년 11월');expect(d.message()).toContain('3건');return d.accept();});
 await page.getByRole('button',{name:'월간 초기화',exact:true}).click();
 await expect(page.locator('.summary-card').first()).toContainText('0시간');
 await expect(page.locator('.count-total')).toContainText('0회');await page.reload();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('chagok.journal.v1')!).entries.map((e:{id:string})=>e.id))).toEqual(['d','e']);
 await expect(page.getByRole('combobox',{name:'이 달의 파이오니아 신분'})).toHaveValue('정규 파이오니아');
 await expect(page.getByRole('button',{name:'월간 초기화',exact:true})).toBeDisabled();
});
test('새 기록 기본은 2시간이고 편집에서는 기존 시간을 유지한다',async({page})=>{
 await seed(page);await page.getByRole('button',{name:'봉사 기록하기',exact:true}).click();
 const d=page.getByRole('dialog');await expect(d.getByRole('combobox',{name:'시간',exact:true})).toHaveValue('2');
 await expect(d.getByRole('combobox',{name:'분',exact:true})).toHaveValue('0');
 await page.getByRole('button',{name:'닫기',exact:true}).click();await page.locator('.entry-row').nth(1).click();
 await expect(d.getByRole('combobox',{name:'시간',exact:true})).toHaveValue('0');
 await expect(d.getByRole('combobox',{name:'분',exact:true})).toHaveValue('30');
});
test('초기화 저장에 실패하면 기존 기록과 통계를 보존한다',async({page})=>{
 await seed(page);await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('full','QuotaExceededError');};});
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'월간 초기화',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('저장하지 못했습니다');await expect(page.locator('.entry-row')).toHaveCount(2);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('chagok.journal.v1')!).entries.length)).toBe(5);
});
