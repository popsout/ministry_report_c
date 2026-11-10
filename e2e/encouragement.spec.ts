import {test,expect} from '@playwright/test';
for(const width of [390,1440]){
 test(`compact button expands 70 unique motivational messages at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/?device=1#/goals');
  const section=page.getByRole('region',{name:'다이어트 동기부여 문구'});
  const toggle=section.getByRole('button',{name:'다이어트 동기부여 70선'});
  await expect(toggle).toHaveAttribute('aria-expanded','false');
  await expect(section.getByRole('listitem')).toHaveCount(0);
  expect((await section.boundingBox())!.height).toBeLessThanOrEqual(56);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  await expect(section.getByRole('listitem')).toHaveCount(70);
  const messages=await section.locator('li p').allTextContents();expect(new Set(messages).size).toBe(70);
  const scroll=section.getByRole('region',{name:'동기부여 70개 목록'});
  const metrics=await scroll.evaluate(el=>({content:el.scrollHeight,box:el.clientHeight}));
  expect(metrics.content).toBeGreaterThan(metrics.box);expect(metrics.box).toBeLessThanOrEqual(400);
  await scroll.focus();await page.keyboard.press('End');
  await expect.poll(()=>scroll.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  await section.locator('li').last().scrollIntoViewIfNeeded();
  await expect(section.locator('li').last()).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await toggle.scrollIntoViewIfNeeded();
  await page.screenshot({path:`/tmp/chagok-motivation-${width}.png`,fullPage:true});
  await toggle.focus();await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded','false');
  await expect(section.getByRole('listitem')).toHaveCount(0);
 });
}
