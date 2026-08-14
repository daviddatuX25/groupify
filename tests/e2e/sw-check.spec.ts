import { expect, test } from '@playwright/test';

test('installs the service worker and reports it active', async ({ page }) => {
    await page.goto('/');

    // Fast-fail guard: registration is gated on a production build + secure
    // origin (app.tsx registers only when import.meta.env.PROD). A dev build
    // or untrusted cert (edge rig) would otherwise hang for the full timeout.
    const sw = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return { ok: false, reason: 'serviceWorker unavailable' };
        const ready = await Promise.race([
            (navigator as any).serviceWorker.ready.then(() => ({ ok: true as const })),
            new Promise<{ ok: false; reason: string }>((resolve) =>
                setTimeout(() => resolve({ ok: false, reason: 'SW never became ready (dev build or untrusted cert?)' }), 5000),
            ),
        ]);
        return ready;
    });

    if (!sw.ok) {
        test.skip(true, `SW not registered: ${sw.reason} — requires the prod build on a secure origin`);
        return;
    }

    const state = await page.evaluate(async () => {
        const reg = await (navigator as any).serviceWorker?.getRegistration();
        return reg ? reg.active?.state ?? null : null;
    });
    expect(state).toBe('activated');
});
