import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('group card opens a detail view with messaging', async ({ page }) => {
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
    const body = await page.locator('body').innerText();
    const code = body.match(/\b\d{6}\b/)?.[0] ?? '';
    const pin = body.match(/PIN:\s*(\d{4})/)?.[1] ?? '';

    const token = randomUUID();
    await page.goto(`/join/${code}`);
    await page.getByPlaceholder('PIN').fill(pin);
    await page.getByPlaceholder('Your name').fill('Maya');
    await page.getByRole('button', { name: /enter the room/i }).click();
    await page.waitForURL(/\/s\/\d{6}/);
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: /create new group/i })).toBeVisible();
    await page.getByRole('button', { name: /create new group/i }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Team Alpha' })).toBeVisible();

    await page.getByRole('button', { name: /open team/i }).click();
    await expect(page.getByRole('dialog', { name: /team alpha group details/i })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Team Alpha', exact: true })).toBeVisible();
    await expect(page.getByText('Group chat', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/message team alpha/i)).toBeVisible();
    await page.getByRole('button', { name: /close group details/i }).first().click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
});
