import { expect, test } from '@playwright/test';

/**
 * CAP-12 offline resilience: the service worker precaches the app shell —
 * after a first online load, going offline must still render the app.
 * Self-skips where SW registration is impossible (self-signed edge rig —
 * browsers validate the SW script's cert themselves).
 */
test('renders the app shell from the service worker while offline', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Groupify home' })).toBeVisible();

    const sw = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return { ok: false as const, reason: 'serviceWorker unavailable' };
        return Promise.race([
            (navigator as any).serviceWorker.ready.then(() => ({ ok: true as const })),
            new Promise<{ ok: false; reason: string }>((resolve) =>
                setTimeout(() => resolve({ ok: false, reason: 'SW never became ready (untrusted cert?)' }), 5000),
            ),
        ]);
    });

    if (!sw.ok) {
        test.skip(true, `SW not registered: ${sw.reason} — offline drill requires a trusted origin`);
        return;
    }

    await context.setOffline(true);
    await page.reload();

    // The precached shell serves the landing without the network.
    await expect(page.getByRole('link', { name: 'Groupify home' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /start a new room/i })).toBeVisible();
});
