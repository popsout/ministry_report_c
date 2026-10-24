import {test,expect} from '@playwright/test';
test('첫 화면을 간소화하고 날짜 선택 시 해당 날짜 팝업을 연다',async({page})=>{
 await page.clock.setFixedTime(new Date(2026,10,3,12));await page.goto('/');
 await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.locator('.daily-panel')).toHaveCount(0);
 const day=page.getByRole('button',{name:/2026-11-03,/});await day.click();
 const d=page.getByRole('dialog',{name:'11월 3일의 기록'});await expect(d).toBeVisible();
 await expect(d).toContainText('아직 기록이 없는 날');await expect(d.getByRole('button',{name:'일간 초기화'})).toBeDisabled();
 await d.getByRole('button',{name:'기록 추가',exact:true}).click();
 await expect(page.getByRole('dialog').locator('input[type=date]')).toHaveValue('2026-11-03');
 await page.getByRole('button',{name:'기록 저장',exact:true}).click();await expect(d).toBeVisible();
 await expect(d.locator('.entry-row')).toContainText('2시간');await expect(d).toContainText('총 2시간 · 1회');
 await d.locator('.entry-row').click();await page.getByRole('button',{name:'날짜 기록으로 돌아가기'}).click();await expect(d).toBeVisible();
 await page.keyboard.press('Escape');await expect(d).not.toBeVisible();await expect(day).toBeFocused();
});
test('인접 월 날짜를 눌러도 올바른 날짜에 기록한다',async({page})=>{
 await page.goto('/');const day=page.locator('.day.outside').first();const date=(await day.getAttribute('aria-label'))!.split(',')[0];
 await day.click();
 await page.getByRole('dialog').getByRole('button',{name:'기록 추가',exact:true}).click();
 await expect(page.getByRole('dialog').locator('input[type=date]')).toHaveValue(date);
});
