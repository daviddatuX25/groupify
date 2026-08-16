import { expect, test } from '@playwright/test';
import { createSession } from './fixtures/session';
import { join } from './fixtures/participant';

test('group card opens a detail view with messaging', { tag: '@smoke' }, async ({ page }) => {
    const { code, pin } = await createSession(page);
    await join(page, code, pin, 'Maya');

    await page.waitForTimeout(1000);
    await expect(
        page.getByRole('button', { name: /create new group/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: /create new group/i }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Team Alpha' })).toBeVisible();

    await page.getByRole('button', { name: /open team/i }).click();
    await expect(
        page.getByRole('dialog', { name: /team alpha group details/i }),
    ).toBeVisible();
    await expect(
        page.getByRole('dialog').getByRole('heading', {
            name: 'Team Alpha',
            exact: true,
        }),
    ).toBeVisible();
    await expect(page.getByText('Group chat', { exact: true })).toBeVisible();
    await expect(
        page.getByRole('dialog').getByLabel(/message team alpha/i),
    ).toBeVisible();
    await page.getByRole('button', { name: /close group details/i }).first().click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
});
