import {test,expect} from '@playwright/test';
test('마우스를 올려 안내를 읽고 클릭으로 고정한 뒤 바깥에서 닫는다',async({page})=>{
 await page.goto('/?preview=1');const button=page.getByRole('button',{name:'개인정보와 열람 권한 안내'});const panel=page.getByRole('region',{name:'개인정보와 열람 권한',exact:true});
 await expect(panel).not.toBeVisible();await button.hover();await expect(panel).toBeVisible();await panel.hover();await expect(panel).toBeVisible();
 await expect(panel).toContainText('가입 이메일');await expect(panel).toContainText('비밀번호 원문을 기록하거나 조회하는 기능이 없습니다');
 await button.click();await page.getByRole('heading',{level:1}).hover();await expect(panel).toBeVisible();
 await page.getByRole('heading',{level:1}).click();await expect(panel).not.toBeVisible();
});
test('키보드로 안내를 열고 Esc로 닫는다',async({page})=>{
 await page.goto('/');const button=page.getByRole('button',{name:'개인정보와 열람 권한 안내'});
 await button.focus();await expect(button).toHaveAttribute('aria-expanded','true');await page.keyboard.press('Escape');await expect(button).toHaveAttribute('aria-expanded','false');
 await page.keyboard.press('Enter');await expect(button).toHaveAttribute('aria-expanded','true');
});
test('휴대폰에서 탭해 읽을 수 있고 화면 밖으로 넘치지 않는다',async({browser})=>{
 const context=await browser.newContext({viewport:{width:360,height:780},isMobile:true,hasTouch:true});const page=await context.newPage();
 await page.goto('http://127.0.0.1:5174/');await page.getByRole('button',{name:'개인정보와 열람 권한 안내'}).tap();
 const panel=page.getByRole('region',{name:'개인정보와 열람 권한',exact:true});await expect(panel).toBeVisible();
 const box=await panel.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(360);
 await expect(panel).toContainText('사이트 개발자·DB 관리자');await page.locator('.breadcrumb').tap();await expect(panel).not.toBeVisible();await context.close();
});
