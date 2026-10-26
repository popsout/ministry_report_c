import {test,expect} from '@playwright/test';
import {available,event,mock,login} from './helpers/bible';
test('실제 배포 빌드의 앱 셸을 저장하고 오프라인 새로고침 후 암호화 서가만 연다',async({context,page})=>{
 test.skip(!available,'공개 클라이언트 설정 필요');
 await page.setViewportSize({width:390,height:844});await mock(context);await login(page);
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await page.getByRole('button',{name:'이 기기에 저장',exact:true}).click();await page.locator('input[name=vaultPassword]').fill('device-only-secret');await page.locator('input[name=vaultConfirm]').fill('device-only-secret');
 await page.getByRole('button',{name:'암호화하여 저장'}).click();await expect(page.getByRole('status')).toContainText('암호화 저장');
 const cached=await page.evaluate(async()=>{const entries=[];for(const name of await caches.keys())for(const request of await(await caches.open(name)).keys())entries.push(request.url);return entries;});
 expect(cached.length).toBeGreaterThanOrEqual(3);
 expect(cached.some(url=>url.endsWith('index.html'))).toBe(true);expect(cached.every(url=>new URL(url).origin==='http://127.0.0.1:5181')).toBe(true);
 expect(cached.some(url=>/supabase|auth\/v1|rest\/v1/.test(url))).toBe(false);
 await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'저장된 서가 열기'})).toBeVisible();await expect(page.getByText(event.summary)).toHaveCount(0);
 await page.locator('input[name=unlockPassword]').fill('device-only-secret');await page.getByRole('button',{name:'서가 열기',exact:true}).click();await page.getByRole('button',{name:/통일 왕국/}).click();await expect(page.getByText(event.summary)).toBeVisible();
 await page.screenshot({path:'test-results/bible-mobile-offline.png',fullPage:true});
 await context.setOffline(false);
});
