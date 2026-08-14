import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * CAP-3 propagation: a membership change must reach other clients in ~1s
 * (realtime path only — no reload fallback here).
 */
test('realtime propagation latency stays under 2s', async ({ page }) => {
    await page.goto('/new');
    const xsrf = await page.evaluate(() => {
        const c = document.cookie.split('; ').find((x) => x.startsWith('XSRF-TOKEN='));
        return c ? decodeURIComponent(c.split('=')[1]) : '';
    });
    const created = await page.request.post('/sessions', { headers: { 'X-XSRF-TOKEN': xsrf } });
    const url = created.url();
    const sid = url.match(/sessions\/(\d+)/)?.[1] ?? '';
    const atok = url.match(/token=(\w+)/)?.[1] ?? '';

    await page.goto(`/admin/sessions/${sid}?token=${atok}`);
    const code = (await page.getByText(/\b\d{6}\b/).first().textContent())?.trim() ?? '';
    const pin = (await page.getByText(/PIN:/).textContent())?.match(/\d{4}/)?.[0] ?? '';

    const tokenA = randomUUID();
    const tokenB = randomUUID();
    const join = (t: string, name: string) =>
        page.request.post(`/join/${code}`, {
            headers: { 'X-Device-Token': t, 'X-XSRF-TOKEN': xsrf, 'Content-Type': 'application/json' },
            data: { pin, name, device_token: t },
        });
    await join(tokenA, 'Maya');
    await join(tokenB, 'Leo');

    // Maya creates a group; Leo joins it; measure until Maya's board reflects it.
    const consoleLogs: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleLogs.push(m.text()); });
    page.on('pageerror', (e) => consoleLogs.push('PAGEERROR: ' + String(e)));
    await page.addInitScript((t) => localStorage.setItem('groupify.device_token', t), tokenA);
    await page.goto(`/s/${code}?device_token=${tokenA}`);
    await page.getByRole('button', { name: /create new group/i }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Team Alpha' })).toBeVisible();

    const gidRes = await page.request.get(`/api/sessions/${code}/board`, { headers: { 'X-Device-Token': tokenA } });
    const gid = (await gidRes.json()).groups[0].id as number;

    await page.waitForTimeout(4000); // let Maya's WS subscription settle first

    const started = Date.now();
    await page.request.post(`/s/${code}/groups/${gid}/join`, {
        headers: { 'X-Device-Token': tokenB, 'X-XSRF-TOKEN': xsrf, 'Content-Type': 'application/json' },
        data: {},
    });

    // Realtime only: Leo must appear on Maya's board without a reload.
    await expect(page.getByText('Leo')).toBeVisible({ timeout: 2000 }).catch(async () => {
        console.log('CONSOLE:', JSON.stringify(consoleLogs));
        console.log('BODY:', (await page.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n/g, ' | '));
        throw new Error('realtime propagation failed');
    });
    const elapsed = Date.now() - started;
    console.log(`propagation: ${elapsed}ms (CAP-3 budget 1000ms)`);
    expect(elapsed).toBeLessThan(2000);
});
