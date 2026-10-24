import { test, expect } from '@playwright/test';
const palettes=[
 {role:'일반',colors:['rgb(98, 106, 122)','rgb(161, 168, 180)','rgb(211, 215, 223)']},
 {role:'보조 파이오니아',colors:['rgb(129, 96, 177)','rgb(194, 173, 220)','rgb(226, 215, 237)']},
 {role:'정규 파이오니아',colors:['rgb(50, 125, 116)','rgb(134, 185, 169)','rgb(197, 226, 216)']},
];
for(const palette of palettes)test(`${palette.role}의 도넛·범례·달력 표시가 같은 테마를 따른다`,async({page})=>{
 await page.goto('/?preview=1');
 const before=await page.locator('.legend-row').allTextContents();
 await page.getByRole('combobox',{name:'이 달의 파이오니아 신분'}).selectOption(palette.role);
 for(let i=0;i<3;i++){
  await expect(page.locator('.legend-dot').nth(i)).toHaveCSS('background-color',palette.colors[i]);
  await expect(page.locator('.donut')).toHaveCSS('background-image',new RegExp(palette.colors[i].replace(/[()]/g,'\\$&')));
 }
 await expect(page.locator('.day-dots i').first()).toHaveCSS('background-color',palette.colors[0]);
 expect(await page.locator('.legend-row').allTextContents()).toEqual(before);
 await page.getByRole('button',{name:'전체 기록',exact:true}).click();
 await expect(page.locator('.legend-dot').first()).toHaveCSS('background-color',palette.colors[0]);
});
test('저장된 월별 테마의 통계 색상이 새로고침과 월 전환 후 유지된다',async({page})=>{
 await page.goto('/');
 const role=page.getByRole('combobox',{name:'이 달의 파이오니아 신분'});
 await role.selectOption('정규 파이오니아');await page.reload();
 await expect(page.locator('.legend-dot').first()).toHaveCSS('background-color',palettes[2].colors[0]);
 await page.getByRole('button',{name:'다음 달',exact:true}).click();
 await expect(page.locator('.legend-dot').first()).toHaveCSS('background-color',palettes[0].colors[0]);
 await page.getByRole('button',{name:'이전 달',exact:true}).click();
 await expect(page.locator('.legend-dot').first()).toHaveCSS('background-color',palettes[2].colors[0]);
});
