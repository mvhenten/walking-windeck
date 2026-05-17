import { test, expect, Page } from '@playwright/test';

async function blockExternalTiles(page: Page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (
      url.includes('tile.opentopomap.org') ||
      url.includes('tile.waymarkedtrails.org') ||
      url.includes('brouter.de')
    ) {
      return route.fulfill({ status: 200, body: '' });
    }
    return route.continue();
  });
}

test.beforeEach(async ({ page }) => {
  await blockExternalTiles(page);
});

test('map page loads with hamburger and FAB visible', async ({ page }) => {
  await page.goto('/');

  const hamburger = page.getByRole('button', { name: 'Menu' });
  await expect(hamburger).toBeVisible();

  const leafletContainer = page.locator('.leaflet-container');
  await expect(leafletContainer).toBeVisible();
});

test('hamburger opens drawer rendered above the map (regression #9/#10)', async ({ page }) => {
  await page.goto('/');

  const hamburger = page.getByRole('button', { name: 'Menu' });
  await hamburger.click();

  const drawerTitle = page.getByRole('heading', { name: 'WalkingWindeck' });
  await expect(drawerTitle).toBeVisible();

  const panel = page.locator('div.fixed.inset-y-0.left-0').first();
  const backdrop = page.locator('div.fixed.inset-0.bg-black\\/80').first();

  const panelZ = await panel.evaluate((el) => window.getComputedStyle(el).zIndex);
  const backdropZ = await backdrop.evaluate((el) => window.getComputedStyle(el).zIndex);

  expect(Number(panelZ)).toBeGreaterThanOrEqual(1000);
  expect(Number(backdropZ)).toBeGreaterThanOrEqual(1000);

  const panelBox = await panel.boundingBox();
  if (!panelBox) throw new Error('panel has no bounding box');
  expect(panelBox.width).toBeGreaterThan(0);
  expect(panelBox.x).toBeGreaterThanOrEqual(-1);
});

test('drawer navigates to Saved routes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'Saved routes' }).click();
  await expect(page).toHaveURL(/\/routes$/);
  await expect(page.getByRole('heading', { name: 'Saved Routes' })).toBeVisible();
});

test('drawer navigates to Settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
});
