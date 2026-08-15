import { expect, test, type Page } from '@playwright/test';

async function createRoom(page: Page): Promise<string> {
    await page.goto('/new');
    const xsrf = await page.evaluate(() => {
        const cookie = document.cookie.split('; ').find((value) => value.startsWith('XSRF-TOKEN='));

        return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
    });
    const created = await page.request.post('/sessions', { headers: { 'X-XSRF-TOKEN': xsrf } });
    const url = created.url();
    const sessionId = url.match(/sessions\/(\d+)/)?.[1] ?? '';
    const adminToken = url.match(/token=(\w+)/)?.[1] ?? '';

    await page.goto(`/admin/sessions/${sessionId}?token=${adminToken}`);

    return (await page.locator('body').innerText()).match(/\b\d{6}\b/)?.[0] ?? '';
}

test('participant can save and remove a room from the homepage', async ({ page }) => {
    const code = await createRoom(page);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`/join/${code}`);

    await page.getByRole('button', { name: /save this room/i }).click();
    await expect(page.getByRole('button', { name: /room saved on this browser/i })).toBeVisible();

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Your saved rooms' })).toBeVisible();
    await expect(page.getByText(code, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /remove room/i }).click();
    await expect(page.getByText(code, { exact: true })).toHaveCount(0);
});

test('saved-room list ignores malformed and duplicate browser records', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
        localStorage.setItem(
            'groupify.saved_sessions.v1',
            JSON.stringify([
                { code: '123456', label: 'Room 123456', lastVisitedAt: 20 },
                { code: '123456', label: 'Older duplicate', lastVisitedAt: 10 },
                { code: 'not-a-code', label: 'Invalid', lastVisitedAt: 30 },
                'not-an-object',
            ]),
        );
    });
    await page.reload();

    await expect(page.getByText('123456', { exact: true })).toHaveCount(1);
    await expect(page.getByText('Older duplicate', { exact: true })).toHaveCount(0);
});

test('session setup presents access and duration choices as cards', async ({ page }) => {
    await page.goto('/new');

    await expect(page.getByRole('radio', { name: /open room/i })).toBeChecked();
    await expect(page.getByRole('radio', { name: /^1 day/i })).toBeChecked();

    await page.getByRole('radio', { name: /review arrivals/i }).check();
    await expect(page.getByText('Let QR visitors skip the PIN')).toBeVisible();

    await page.getByRole('radio', { name: /choose a date and time/i }).check();
    await expect(page.getByLabel('Room closing time')).toBeVisible();
});
