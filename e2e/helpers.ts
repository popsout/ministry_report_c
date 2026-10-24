import type { Page } from '@playwright/test';
export async function openSelectedDay(page: Page){
 await page.locator('.day[aria-pressed="true"]').click();
}
