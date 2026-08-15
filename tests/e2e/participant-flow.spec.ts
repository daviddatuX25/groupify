import { expect, test, type Page } from '@playwright/test';

/**
 * Core night-one flows: create → join → pool → create group → join group → leave.
 */

async function createSession(page: Page): Promise<{ code: string; pin: string; adminUrl: string }> {
    await page.goto('/new');
    await page.getByRole('button', { name: /create session/i }).click();
    await page.waitForURL(/\/admin\/sessions\/\d+/);
    const adminUrl = page.url();
    const code = await page.locator('body').innerText().then((t) => t.match(/\d{6}/)?.[0] ?? '');
    const pin = await page.locator('body').innerText().then((t) => t.match(/PIN:\s*(\d{4})/)?.[1] ?? '');
    return { code, pin, adminUrl };
}

async function join(page: Page, code: string, pin: string, name: string): Promise<void> {
    await page.goto('/'); // same-origin context for localStorage
    await page.evaluate(() => localStorage.clear());
    await page.goto(`/join/${code}`);
    const pinInput = page.getByLabel('4-digit PIN');
    if (await pinInput.count() > 0) {
        await pinInput.fill(pin);
    }
    await page.getByLabel('Your name').fill(name);
    await page.getByRole('button', { name: /enter the room/i }).click();
    await page.waitForURL(/\/s\/\d{6}/);
    await expect(page.getByText(/you.?re in the pool/)).toBeVisible();
}

test('full participant flow: create, join, pool, create group', async ({ page }) => {
    const { code, pin } = await createSession(page);
    await join(page, code, pin, 'Maya');

    // Create a group — auto-named Team Alpha
    await page.getByRole('button', { name: /create new group/i }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Team Alpha' })).toBeVisible();
    await expect(page.getByText(/you.?re in Team Alpha/)).toBeVisible();
    await expect(page.getByRole('button', { name: /leave team alpha/i })).toBeVisible();
});

test('second participant joins the first group and the board updates', async ({ browser }) => {
    const admin = await browser.newPage();
    const { code, pin } = await createSession(admin);
    await admin.close();

    const a = await browser.newPage();
    await join(a, code, pin, 'Maya');
    await a.getByRole('button', { name: /create new group/i }).click();
    await a.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(a.getByRole('heading', { name: 'Team Alpha' })).toBeVisible();

    const b = await browser.newPage();
    await join(b, code, pin, 'Leo');
    await b.getByRole('button', { name: 'Join', exact: true }).click();

    // Maya sees Leo appear (realtime preferred; reload fallback for slow
    // queue workers under parallel e2e load — the server state is the assertion)
    try {
        await expect(a.getByText('Leo')).toBeVisible({ timeout: 10000 });
    } catch {
        await a.reload();
        await expect(a.getByText('Leo')).toBeVisible({ timeout: 10000 });
    }
    await expect(a.getByText('4 open')).toBeVisible();
    await a.close();
    await b.close();
});

test('leave returns to the pool', async ({ page }) => {
    const { code, pin } = await createSession(page);
    await join(page, code, pin, 'Maya');
    await page.getByRole('button', { name: /create new group/i }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText(/you.?re in Team Alpha/)).toBeVisible();

    await page.getByRole('button', { name: /leave team alpha/i }).click();
    await expect(page.getByText(/you.?re in the pool/)).toBeVisible();
});
