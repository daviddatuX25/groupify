import { expect, test } from '@playwright/test';

/**
 * CAP-12 offline resilience: the service worker precaches the app shell —
 * after a first online load, going offline must still render the app.
 */
test('renders the app shell from the service worker while offline', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByText('Groupify')).toBeVisible();
    await page.evaluate(async () => {
        await (navigator as any).serviceWorker?.ready;
    });

    await context.setOffline(true);
    await page.reload();

    // The precached shell serves the landing without the network.
    await expect(page.getByText('Groupify')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Start a session')).toBeVisible();
});
