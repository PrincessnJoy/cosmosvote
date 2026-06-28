import { test, expect } from '@playwright/test';

test('frontend displays proposals and allows viewing details', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Wait for a proposal card to appear
  const first = await page.locator('article[role="button"]').first();
  await expect(first).toBeVisible({ timeout: 10000 });

  // Open the detail view
  await first.click();

  // Expect modal with "Proposal #"
  await expect(page.locator('text=Proposal #')).toBeVisible();
});
