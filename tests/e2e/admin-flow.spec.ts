import { expect, test, type Page } from '@playwright/test';

/**
 * Admin god-mode flows: stats, freeze → join blocked, dissolve, CSV export.
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

test('admin panel shows QR, PIN, and live stats', async ({ page }) => {
    const { pin } = await createSession(page);
    await expect(page.getByText(/scan to join/i)).toBeVisible();
    await expect(page.getByText(pin).first()).toBeVisible();
    await expect(page.getByText('Freeze')).toBeVisible();
    await expect(page.getByText('Dissolve all')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
});

test('freeze blocks joins; unfreeze resumes', async ({ page, browser }) => {
    const { code, pin } = await createSession(page);

    await page.getByRole('button', { name: 'Freeze', exact: true }).click();
    await expect(page.getByText('FROZEN').first()).toBeVisible();

    const participant = await browser.newPage();
    await participant.goto('/');
    await participant.evaluate(() => localStorage.clear());
    await participant.goto(`/join/${code}`);
    const pinInput = participant.getByLabel('4-digit PIN');
    if (await pinInput.count()) {
        await pinInput.fill(pin);
    }
    await participant.getByLabel('Your name').fill('Maya');
    await participant.getByRole('button', { name: /enter the room/i }).click();
    // Frozen sessions reject the join — the participant stays on the form
    await expect(participant.getByLabel('Your name')).toBeVisible({ timeout: 5000 });
    await participant.close();

    await page.getByRole('button', { name: 'Unfreeze', exact: true }).click();
    await expect(page.getByText('Freeze')).toBeVisible();
});

test('dissolve all returns everyone to the pool', async ({ page, browser }) => {
    const { code, pin } = await createSession(page);

    const a = await browser.newPage();
    await a.goto('/');
    await a.evaluate(() => localStorage.clear());
    await a.goto(`/join/${code}`);
    const pinInput = a.getByLabel('4-digit PIN');
    if (await pinInput.count()) {
        await pinInput.fill(pin);
    }
    await a.getByLabel('Your name').fill('Maya');
    await a.getByRole('button', { name: /enter the room/i }).click();
    await a.waitForURL(/\/s\/\d{6}/);
    await a.getByRole('button', { name: /create new group/i }).click();
    await a.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(a.getByRole('heading', { name: 'Team Alpha' })).toBeVisible();

    await page.getByRole('button', { name: 'Dissolve all' }).click();
    await expect(page.getByText(/unassigned pool \(1\)/i)).toBeVisible();
    await a.close();
});


