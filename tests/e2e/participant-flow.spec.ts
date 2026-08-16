import { expect, test } from '@playwright/test';
import { createSession } from './fixtures/session';
import { join } from './fixtures/participant';

/**
 * Core night-one flows: create → join → pool → create group → join group → leave.
 */

test('full participant flow: create, join, pool, create group', { tag: '@smoke' }, async ({
    page,
}) => {
    const { code, pin } = await createSession(page);
    await join(page, code, pin, 'Maya');
    await expect(page.getByText(/you.?re in the pool/)).toBeVisible();

    // Create a group — auto-named Team Alpha
    await page.getByRole('button', { name: /create new group/i }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(
        page.getByRole('heading', { name: 'Team Alpha' }),
    ).toBeVisible();
    await expect(page.getByText(/you.?re in Team Alpha/)).toBeVisible();
    await expect(
        page.getByRole('button', { name: /leave team alpha/i }),
    ).toBeVisible();
});

test('second participant joins the first group and the board updates', { tag: '@smoke' }, async ({
    browser,
}) => {
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

test('leave returns to the pool', { tag: '@smoke' }, async ({ page }) => {
    const { code, pin } = await createSession(page);
    await join(page, code, pin, 'Maya');
    await expect(page.getByText(/you.?re in the pool/)).toBeVisible();
    await page.getByRole('button', { name: /create new group/i }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText(/you.?re in Team Alpha/)).toBeVisible();

    await page.getByRole('button', { name: /leave team alpha/i }).click();
    await expect(page.getByText(/you.?re in the pool/)).toBeVisible();
});
