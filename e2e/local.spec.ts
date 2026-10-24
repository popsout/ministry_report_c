import { openSelectedDay } from './helpers';
import { test, expect } from '@playwright/test';
async function add(page: import('@playwright/test').Page,note='나의 첫 기록'){
 await page.getByRole('button',{name:'봉사 기록하기',exact:true}).click();
 const d=page.getByRole('dialog');await d.locator('textarea').fill(note);
 await d.getByRole('button',{name:'기록 저장'}).click();await expect(d).not.toBeVisible();
}
test('로그인·외부 요청 없이 기록과 신분을 저장하고 재접속한다',async({page})=>{
 const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5174'))external.push(r.url());});
 await page.goto('/');await expect(page.getByText('구글로 로그인',{exact:true})).toHaveCount(0);
 await expect(page.locator('.summary-card').first()).toContainText('0시간');
 await add(page);
 await page.getByRole('combobox',{name:'이 달의 파이오니아 신분'}).selectOption('보조 파이오니아');
 await page.reload();await openSelectedDay(page);await expect(page.locator('.entry-row')).toContainText('나의 첫 기록');
 await page.getByRole('button',{name:'닫기',exact:true}).click();await expect(page.getByRole('combobox',{name:'이 달의 파이오니아 신분'})).toHaveValue('보조 파이오니아');
 await expect(page.locator('.summary-card').first()).toContainText('2시간');
 expect(external).toEqual([]);await openSelectedDay(page);
 await page.locator('.entry-row').click();await page.getByRole('combobox',{name:'시간',exact:true}).selectOption('3');
 await page.getByRole('button',{name:'기록 저장'}).click();await page.reload();await openSelectedDay(page);
 await expect(page.locator('.entry-row')).toContainText('3시간');
 await page.locator('.entry-row').click();page.once('dialog',d=>void d.accept());
 await page.getByRole('button',{name:'삭제',exact:true}).click();await page.reload();await openSelectedDay(page);
 await expect(page.locator('.entry-row')).toHaveCount(0);
});
test('예시 화면은 실제 기록을 오염시키지 않는다',async({page})=>{
 await page.goto('/');await add(page,'실제 기록');
 await page.getByRole('link',{name:'예시 화면 보기'}).click();
 await expect(page.locator('.connection-banner')).toContainText('예시 화면');
 await add(page,'연습 기록');await page.getByRole('link',{name:'내 기록으로'}).click();await openSelectedDay(page);
 await expect(page.locator('.entry-row')).toHaveCount(1);
 await expect(page.locator('.entry-row')).toContainText('실제 기록');
});
test('저장 공간 오류 시 입력을 보존하고 저장 성공으로 처리하지 않는다',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});
 await page.goto('/');await page.getByRole('button',{name:'봉사 기록하기',exact:true}).click();
 const d=page.getByRole('dialog');await d.locator('textarea').fill('사라지면 안 되는 입력');
 await d.getByRole('button',{name:'기록 저장'}).click();
 await expect(d.getByRole('alert')).toContainText('저장하지 못했습니다');
 await expect(d.locator('textarea')).toHaveValue('사라지면 안 되는 입력');
});
test('손상된 기존 기록을 자동으로 덮어쓰지 않는다',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('chagok.journal.v1','broken-data'));
 await page.goto('/');await expect(page.getByRole('alert')).toContainText('읽지 못했습니다');
 expect(await page.evaluate(()=>localStorage.getItem('chagok.journal.v1'))).toBe('broken-data');
});
test('같은 브라우저의 탭에 수정사항을 반영하고 오래된 편집을 막는다',async({page,context})=>{
 await page.goto('/');await add(page);
 const other=await context.newPage();await other.goto('/');await openSelectedDay(page);await openSelectedDay(other);
 await page.locator('.entry-row').click();await other.locator('.entry-row').click();
 await other.getByRole('combobox',{name:'시간',exact:true}).selectOption('4');
 await other.getByRole('button',{name:'기록 저장'}).click();
 await expect(page.locator('.day[aria-pressed="true"] .day-time')).toContainText('4시간');
 await page.getByRole('button',{name:'기록 저장'}).click();
 await expect(page.getByRole('dialog').getByRole('alert')).toContainText('다른 탭');
 await other.reload();await openSelectedDay(other);await expect(other.locator('.entry-row')).toContainText('4시간');
});
