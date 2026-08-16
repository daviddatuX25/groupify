import { expect, test } from '@playwright/test';
import { createSession } from './fixtures/session';

test('participant can save and remove a room from the homepage', { tag: '@smoke' }, async ({
    page,
}) => {
    const { code } = await createSession(page);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`/join/${code}`);

    await page.getByRole('button', { name: /save this room/i }).click();
    await expect(
        page.getByRole('button', { name: /room saved on this browser/i }),
    ).toBeVisible();
    await page.getByLabel('Your name').fill('Maya');
    const joinResponse = page.waitForResponse(
        (response) =>
            response.request().method() === 'POST' &&
            new URL(response.url()).pathname === `/join/${code}`,
    );
    await page.getByRole('button', { name: /enter the room/i }).click();
    await joinResponse;
    await expect(page).toHaveURL(new RegExp(`/s/${code}`));
    await page.goto('/');
    await expect(
        page.getByRole('heading', { name: 'Your saved rooms' }),
    ).toBeVisible();
    await expect(page.getByText(code, { exact: true })).toBeVisible();

    const participantJoinRequest = page.waitForRequest(
        (request) =>
            request.method() === 'GET' &&
            new URL(request.url()).pathname === `/join/${code}`,
    );
    await page.getByRole('button', { name: /open room/i }).click();
    await participantJoinRequest;

    await page.goto('/');
    await expect(page.getByText(code, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /remove room/i }).click();
    await expect(page.getByText(code, { exact: true })).toHaveCount(0);
});

test('host saved room reopens the admin view', { tag: '@smoke' }, async ({ page }) => {
    const { code } = await createSession(page);

    await page.goto('/');
    await expect(page.getByText(code, { exact: true })).toBeVisible();
    await expect(page.getByText('Host view', { exact: true })).toBeVisible();

    const adminNavigation = page.waitForURL(/\/admin\/sessions\/\d+/);
    await page.getByRole('button', { name: /open room/i }).click();
    await adminNavigation;
    await expect(
        page.getByRole('heading', { name: 'Groupify Admin' }),
    ).toBeVisible();
});

test('legacy saved host room upgrades to the admin view', { tag: '@smoke' }, async ({ page }) => {
    const { code } = await createSession(page);

    await page.evaluate((roomCode) => {
        const sessions = JSON.parse(
            localStorage.getItem('groupify.saved_sessions.v1') ?? '[]',
        ) as Record<string, unknown>[];
        const saved = sessions.find((session) => session.code === roomCode);

        if (saved) {
            delete saved.role;
            delete saved.sessionId;
        }

        localStorage.setItem(
            'groupify.saved_sessions.v1',
            JSON.stringify(sessions),
        );
        localStorage.removeItem('groupify.admin_tokens.v1');
    }, code);

    await page.goto('/');
    await expect(
        page.getByText('Participant view', { exact: true }),
    ).toBeVisible();

    const adminNavigation = page.waitForURL(/\/admin\/sessions\/\d+/);
    await page.getByRole('button', { name: /open room/i }).click();
    await adminNavigation;
    await expect(
        page.getByRole('heading', { name: 'Groupify Admin' }),
    ).toBeVisible();
});

test('continue advances setup without creating the room', { tag: '@smoke' }, async ({ page }) => {
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

test('creating a room saves it on the host browser', { tag: '@smoke' }, async ({ page }) => {
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

    // Wizard submits via Inertia (URL swaps before the payload renders) and
    // client-side navigation never refreshes the data-page script — the only
    // stable source here is the rendered code display.
    await expect(page.getByText(/^\d{6}$/)).toBeVisible({ timeout: 5000 });
    const code =
        (await page.locator('body').innerText()).match(/\b\d{6}\b/)?.[0] ?? '';
    expect(code).toMatch(/^\d{6}$/);

    await page.goto('/');
    await expect(page.getByText(code, { exact: true })).toBeVisible();
});

test('homepage opens the QR scanner affordance', { tag: '@smoke' }, async ({ page }) => {
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

test('saved-room list ignores malformed and duplicate browser records', { tag: '@smoke' }, async ({
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

test('session setup uses compact card steps and dot navigation', { tag: '@smoke' }, async ({
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
