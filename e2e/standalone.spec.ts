import { openSelectedDay } from './helpers';
import { test,expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
test('단일 HTML을 HTTP로 제공해 기록 저장과 새로고침 복원을 확인한다',async({page})=>{
 await page.route('**/standalone.html',route=>route.fulfill({contentType:'text/html',body:readFileSync(resolve('release/chagok.html'),'utf8')}));
 await page.goto('/standalone.html');
 await expect(page.getByRole('heading',{name:'봉사 캘린더'})).toBeVisible();
 await page.getByRole('button',{name:'봉사 기록하기',exact:true}).click();
 await page.getByRole('dialog').locator('textarea').fill('단일 파일 테스트');
 await page.getByRole('button',{name:'기록 저장'}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();await page.reload();await openSelectedDay(page);
 await expect(page.locator('.entry-row')).toContainText('단일 파일 테스트');
});
