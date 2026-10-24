import { test, expect } from '@playwright/test';
const serviceColors=['rgb(37, 99, 235)','rgb(245, 158, 11)','rgb(225, 29, 72)'];
const palettes=['일반','보조 파이오니아','정규 파이오니아'].map(role=>({role,colors:serviceColors}));
for(const palette of palettes)test(`${palette.role}에서도 도넛·범례·달력은 봉사별 고정색을 유지한다`,async({page})=>{
 await page.goto('/?preview=1');
 const before=await page.locator('.legend-row').allTextContents();
 await page.getByRole('combobox',{name:'이 달의 파이오니아 신분'}).selectOption(palette.role);
 await expect(page.locator('.journal-title>span')).toHaveCSS('color','rgb(118, 85, 158)');
 for(let i=0;i<3;i++){
  await expect(page.locator('.legend-dot').nth(i)).toHaveCSS('background-color',palette.colors[i]);
  await expect(page.locator('.donut')).toHaveCSS('background-image',new RegExp(palette.colors[i].replace(/[()]/g,'\\$&')));
 }
 await expect(page.locator('.day-dots i').first()).toHaveCSS('background-color',palette.colors[0]);
 expect(await page.locator('.legend-row').allTextContents()).toEqual(before);
 await page.getByRole('button',{name:'전체 기록',exact:true}).click();
 await expect(page.locator('.legend-dot').first()).toHaveCSS('background-color',palette.colors[0]);
});
test('월별 배경 테마는 바뀌어도 봉사별 색상은 유지된다',async({page})=>{
 await page.goto('/');
 const role=page.getByRole('combobox',{name:'이 달의 파이오니아 신분'});
 await role.selectOption('정규 파이오니아');await page.reload();
 await expect(page.locator('.legend-dot').first()).toHaveCSS('background-color',palettes[2].colors[0]);
 await page.getByRole('button',{name:'다음 달',exact:true}).click();
 await expect(page.locator('.legend-dot').first()).toHaveCSS('background-color',palettes[0].colors[0]);
 await page.getByRole('button',{name:'이전 달',exact:true}).click();
 await expect(page.locator('.legend-dot').first()).toHaveCSS('background-color',palettes[2].colors[0]);
});
