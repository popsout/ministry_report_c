import {test,expect} from '@playwright/test';
test('월 목표를 변경하면 빈 구간과 원 안의 목표가 함께 변경된다',async({page})=>{
 await page.goto('/?preview=1');const donut=page.locator('.donut');
 await expect(donut).toHaveAccessibleName(/목표 15시간.*83.3% 달성.*남은 시간 2시간 30분/);
 await expect(page.locator('.ratio-caption')).toContainText('원 한 바퀴 = 목표 15시간');
 await expect(donut).toHaveCSS('background-image',/83\.333/);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'30시간',exact:true}).click();
 await expect(donut).toHaveAccessibleName(/목표 30시간.*41.7% 달성/);
 await expect(donut).toHaveCSS('background-image',/41\.666/);
 await page.getByRole('combobox',{name:'이 달의 파이오니아 신분'}).selectOption('정규 파이오니아');
 await expect(donut).toHaveAccessibleName(/목표 50시간.*25% 달성/);
 await expect(page.locator('.donut-status')).toContainText('37시간 30분');
 await page.getByRole('button',{name:'전체 기록',exact:true}).click();
 await expect(page.locator('.ratio-caption')).toContainText('시간 기준');
 await expect(page.locator('.donut-status')).toHaveCount(0);
 await expect(donut).not.toHaveAccessibleName(/목표/);
});
test('기록을 추가해 초과 달성하면 초과 시간을 표시한다',async({page})=>{
 await page.goto('/?preview=1');await page.getByRole('button',{name:'봉사 기록하기',exact:true}).click();
 await page.getByRole('combobox',{name:'시간',exact:true}).selectOption('3');await page.getByRole('button',{name:'기록 저장',exact:true}).click();
 await expect(page.locator('.donut-status')).toContainText('목표 달성 · 30분 초과');
 await expect(page.locator('.donut')).toHaveAccessibleName(/103.3% 달성.*남은 시간 0시간/);
});
test('캘린더 목표 바는 이번 달 봉사 종류별 시간 비중으로 채운다',async({page})=>{
 await page.goto('/?preview=1');const region=page.getByRole('region',{name:'이번 달 목표 달성 현황'});
 const bar=region.getByRole('progressbar').locator('span');
 const gradient=await bar.evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(gradient).toContain('rgb(37, 99, 235) 0%, rgb(37, 99, 235) 64%');
 expect(gradient).toContain('rgb(245, 158, 11) 64%, rgb(245, 158, 11) 76%');
 expect(gradient).toContain('rgb(225, 29, 72) 76%, rgb(225, 29, 72) 100%');
 await expect(bar).toHaveAttribute('style',/width: 83.3%/);
 await page.getByRole('button',{name:'전체 기록',exact:true}).click();
 expect(await bar.evaluate(el=>getComputedStyle(el).backgroundImage)).toBe(gradient);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'월간 초기화',exact:true}).click();
 await expect(bar).toHaveAttribute('style',/width: 0%/);
});
