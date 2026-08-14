import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Approval-queue flow (CAP-4): request-to-join → leader approves → seated.
 */
test('approval-mode join: request, approve, seat', async ({ page }) => {
    await page.goto('/new');
    const xsrf = await page.evaluate(() => {
        const c = document.cookie.split('; ').find((x) => x.startsWith('XSRF-TOKEN='));
        return c ? decodeURIComponent(c.split('=')[1]) : '';
    });
    const created = await page.request.post('/sessions', { headers: { 'X-XSRF-TOKEN': xsrf } });
    const url = created.url();
    const sid = url.match(/sessions\/(\d+)/)?.[1] ?? '';
    const atok = url.match(/token=(\w+)/)?.[1] ?? '';

    // Enable approval mode + create the leader's group via API.
    const admin = { 'X-Admin-Token': atok, 'X-XSRF-TOKEN': xsrf, 'Content-Type': 'application/json', Accept: 'application/json' };
    await page.request.put(`/admin/sessions/${sid}/config`, {
        headers: admin,
        data: { rules: { join_mode: 'approval' } },
    });

    await page.goto(`/admin/sessions/${sid}?token=${atok}`);
    const code = (await page.getByText(/\b\d{6}\b/).first().textContent())?.trim() ?? '';
    const pin = (await page.getByText(/PIN:/).textContent())?.match(/\d{4}/)?.[0] ?? '';

    const tokenA = randomUUID();
    const tokenB = randomUUID();
    const joinA = { 'X-Device-Token': tokenA, 'X-XSRF-TOKEN': xsrf, 'Content-Type': 'application/json', Accept: 'application/json' };
    await page.request.post(`/join/${code}`, { headers: joinA, data: { pin, name: 'Maya', device_token: tokenA } });
    const groupRes = await page.request.post(`/s/${code}/groups`, { headers: joinA, data: {} });
    expect(groupRes.ok()).toBeTruthy();
    const gid = (await (await page.request.get(`/api/sessions/${code}/board`, { headers: { 'X-Device-Token': tokenA } })).json()).groups[0].id;

    // Leo requests to join the group (approval mode → pending).
    await page.request.post(`/join/${code}`, {
        headers: { 'X-Device-Token': tokenB, 'X-XSRF-TOKEN': xsrf, 'Content-Type': 'application/json' },
        data: { pin, name: 'Leo', device_token: tokenB },
    });
    await page.request.post(`/s/${code}/groups/${gid}/join`, {
        headers: { 'X-Device-Token': tokenB, 'X-XSRF-TOKEN': xsrf, 'Content-Type': 'application/json' },
        data: {},
    });

    // Maya (leader) sees the pending request and approves it.
    await page.addInitScript((t) => localStorage.setItem('groupify.device_token', t), tokenA);
    await page.goto(`/s/${code}?device_token=${tokenA}`);
    await expect(page.getByText('Leo')).toBeVisible({ timeout: 5000 });

    // Leader board shows the pending request with an approve action.
    const approve = page.getByRole('button', { name: /approve/i });
    await expect(approve).toBeVisible({ timeout: 5000 });
    await approve.click();

    // Seated: Leo is now an active member of the group.
    await expect
        .poll(async () => {
            const b = await (await page.request.get(`/api/sessions/${code}/board`, { headers: { 'X-Device-Token': tokenA } })).json();
            const g = b.groups.find((x: { id: number }) => x.id === gid);
            return g?.members.some((m: { name: string; role: string }) => m.name === 'Leo' && m.role === 'member');
        }, { timeout: 5000 })
        .toBe(true);
});
