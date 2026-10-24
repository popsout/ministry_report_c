import {test,expect} from '@playwright/test';
test('한 날짜에는 종류별 불빛을 하나씩 표시하고 삭제하면 해당 불빛을 없앤다',async({page})=>{
 await page.clock.setFixedTime(new Date(2026,10,3,12));await page.goto('/');
 await page.evaluate(()=>localStorage.setItem('chagok.journal.v1',JSON.stringify({version:1,settings:[],entries:['호별','호별','편지','전시대'].map((service_type,i)=>({id:String(i),user_id:'local',service_date:'2026-11-03',service_type,minutes:60,note:'',updated_at:'initial'}))})));
 await page.reload();const day=page.getByRole('button',{name:/2026-11-03,/});
 await expect(day.locator('.day-dots i')).toHaveCount(3);
 const expected=[['호별','rgb(37, 99, 235)'],['편지','rgb(245, 158, 11)'],['전시대','rgb(225, 29, 72)']];
 for(const [type,color] of expected){
  await expect(day.locator(`[data-service-type="${type}"]`)).toHaveCSS('background-color',color);
  await expect(day.locator(`[data-service-type="${type}"]`)).not.toHaveCSS('box-shadow','none');
 }
 await expect(page.getByRole('button',{name:/2026-11-04,/}).locator('.day-dots i')).toHaveCount(0);
 await page.locator('.entry-row').filter({hasText:'전시대 봉사'}).click();page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'삭제',exact:true}).click();await expect(day.locator('.day-dots i')).toHaveCount(2);
 await expect(day.locator('[data-service-type="전시대"]')).toHaveCount(0);
 await page.locator('.entry-row').filter({hasText:'호별 봉사'}).first().click();page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'삭제',exact:true}).click();await page.reload();
 await expect(day.locator('.day-dots i')).toHaveCount(2);await expect(day).toHaveAccessibleName(/호별, 편지/);
});
