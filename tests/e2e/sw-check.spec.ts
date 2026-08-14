import { test, expect } from '@playwright/test';

test('installs the service worker and reports it active', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
        await (navigator as any).serviceWorker?.ready;
    });
    const state = await page.evaluate(async () => {
        const reg = await (navigator as any).serviceWorker?.getRegistration();
        return reg ? reg.active?.state ?? null : null;
    });
    expect(state).toBe('activated');
});
