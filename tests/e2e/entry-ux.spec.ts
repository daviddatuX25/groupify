import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function createRoom(page: Page): Promise<string> {
    await page.goto('/new');
    const xsrf = await page.evaluate(() => {
        const cookie = document.cookie
            .split('; ')
            .find((value) => value.startsWith('XSRF-TOKEN='));

        return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
    });
    const created = await page.request.post('/sessions', {
        headers: { 'X-XSRF-TOKEN': xsrf },
    });
    const url = created.url();
    const sessionId = url.match(/sessions\/(\d+)/)?.[1] ?? '';
    const adminToken = url.match(/token=(\w+)/)?.[1] ?? '';

    await page.goto(`/admin/sessions/${sessionId}?token=${adminToken}`);

    return (
        (await page.locator('body').innerText()).match(/\b\d{6}\b/)?.[0] ?? ''
    );
}

test('participant can save and remove a room from the homepage', async ({
    page,
}) => {
    const code = await createRoom(page);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`/join/${code}`);

    await page.getByRole('button', { name: /save this room/i }).click();
    await expect(
        page.getByRole('button', { name: /room saved on this browser/i }),
    ).toBeVisible();

    await page.goto('/');
    await expect(
        page.getByRole('heading', { name: 'Your saved rooms' }),
    ).toBeVisible();
    await expect(page.getByText(code, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /remove room/i }).click();
    await expect(page.getByText(code, { exact: true })).toHaveCount(0);
});

test('continue advances setup without creating the room', async ({ page }) => {
    const sessionPosts: string[] = [];
    page.on('request', (request) => {
        if (
            request.method() === 'POST' &&
            new URL(request.url()).pathname === '/sessions'
        ) {
            sessionPosts.push(request.url());
        }
    });

    await page.goto('/new');
    await page.getByRole('button', { name: /^continue$/i }).click();
    await expect(
        page.getByRole('heading', { name: /how long should it stay open/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: /^continue$/i }).click();
    await expect(
        page.getByRole('heading', { name: 'Keep the results' }),
    ).toBeVisible();
    expect(sessionPosts).toHaveLength(0);
});

test('creating a room saves it on the host browser', async ({ page }) => {
    await page.goto('/new');
    await page.evaluate(() => localStorage.clear());

    await page.getByRole('button', { name: /go to duration step/i }).click();
    await expect(
        page.getByRole('heading', { name: /how long should it stay open/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /go to finish step/i }).click();
    await expect(
        page.getByRole('heading', { name: 'Keep the results' }),
    ).toBeVisible();
    const adminNavigation = page.waitForURL(/\/admin\/sessions\/\d+/);
    await page.getByRole('button', { name: /create room/i }).click();
    await adminNavigation;

    const code =
        (await page.locator('body').innerText()).match(/\b\d{6}\b/)?.[0] ?? '';
    expect(code).toMatch(/^\d{6}$/);

    await page.goto('/');
    await expect(page.getByText(code, { exact: true })).toBeVisible();
});

test('homepage opens the QR scanner affordance', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /scan qr code/i }).click();
    await expect(
        page.getByRole('dialog', { name: /scan a room qr code/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /close qr scanner/i }).click();
    await expect(
        page.getByRole('dialog', { name: /scan a room qr code/i }),
    ).toHaveCount(0);
});

test('saved-room list ignores malformed and duplicate browser records', async ({
    page,
}) => {
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
    await expect(
        page.getByText('Older duplicate', { exact: true }),
    ).toHaveCount(0);
});

test('session setup uses compact card steps and dot navigation', async ({
    page,
}) => {
    await page.goto('/new');

    const openMode = page.getByRole('radio', { name: /open room/i });
    await expect(openMode).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('radio', { name: /review arrivals/i }).click();
    await expect(page.getByText('Let QR visitors skip the PIN')).toBeVisible();
    await expect(
        page.getByRole('radio', { name: /review arrivals/i }),
    ).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('button', { name: /go to duration step/i }).click();
    await expect(
        page.getByRole('heading', { name: /how long should it stay open/i }),
    ).toBeVisible();
    await page.getByRole('radio', { name: /^1 day/i }).click();
    await expect(page.getByRole('radio', { name: /^1 day/i })).toHaveAttribute(
        'aria-checked',
        'true',
    );

    await page.getByRole('button', { name: /go to finish step/i }).click();
    await expect(
        page.getByRole('heading', { name: 'Keep the results' }),
    ).toBeVisible();
    await expect(page.getByLabel('Results retention')).toBeVisible();
});
