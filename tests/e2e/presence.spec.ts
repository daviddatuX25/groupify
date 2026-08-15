import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * FR-3.5 online presence: the header count reflects LIVE connections
 * (presence channel members), not just joined seats.
 */
test('live presence count reflects connected browsers', async ({ page, browser }) => {
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

    // Admin browser is already on the presence channel (count starts at 1).
    await expect(page.getByText(/1 online/)).toBeVisible({ timeout: 5000 });

    // A participant joins from a second browser → both see 2 online.
    const second = await browser.newPage();
    const token = randomUUID();
    await second.addInitScript((t) => localStorage.setItem('groupify.device_token', t), token);
    await second.goto(`/join/${code}`);
    const pinInput = second.getByLabel('4-digit PIN');
    if (await pinInput.count()) {
        await pinInput.fill(pin);
    }
    await second.getByLabel('Your name').fill('Maya');
    await second.getByRole('button', { name: /enter the room/i }).click();
    await second.waitForURL(/\/s\/\d{6}/);

    await expect(page.getByText(/2 online/)).toBeVisible({ timeout: 5000 });
    await expect(second.getByText(/2 online/)).toBeVisible({ timeout: 5000 });

    // Closing the participant browser drops the live count back to 1.
    await second.close();
    await expect(page.getByText(/1 online/)).toBeVisible({ timeout: 5000 });
});
