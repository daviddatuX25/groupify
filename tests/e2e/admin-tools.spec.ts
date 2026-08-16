import { expect, test } from '@playwright/test';
import { apiHeaders } from './fixtures/xsrf';
import { createSession } from './fixtures/session';
import { joinViaApi, newDeviceToken } from './fixtures/participant';

/**
 * Admin tooling: CSV export (API contract), activity feed, and session
 * destroy. KNOWN BUG: the Export UI link carries no admin token, so the
 * header-less click 404s — the export endpoint is tested via its API.
 */

test('CSV export contains participants and their groups', async ({ page }) => {
    const s = await createSession(page);
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);

    // Put Maya in a group so the export has a group assignment.
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Add empty group' }).click();
    await expect(
        page.getByRole('heading', { name: 'Team Alpha' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Actions for Maya' }).click();
    await page.getByRole('button', { name: /^move/i }).click();
    await page.getByLabel('Destination').selectOption({ label: 'Team Alpha' });
    await page
        .getByRole('button', { name: 'Move participants', exact: true })
        .click();
    await expect(page.getByText(/unassigned pool \(0\)/i)).toBeVisible({
        timeout: 5000,
    });

    const res = await page.request.get(
        `/admin/sessions/${s.sessionId}/export`,
        { headers: apiHeaders(s.xsrf, { 'X-Admin-Token': s.adminToken }) },
    );
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type'] ?? '').toContain('text/csv');
    const csv = await res.text();
    expect(csv).toContain('Maya');
    expect(csv).toContain('Team Alpha');
});

test('activity feed records session events', async ({ page }) => {
    const s = await createSession(page);

    // Create a group — the GroupCreated event triggers the admin refetch
    // that populates the activity list (no mount fetch — known gap).
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Add empty group' }).click();
    await expect(
        page.getByRole('heading', { name: 'Team Alpha' }),
    ).toBeVisible();

    await page.getByRole('button', { name: /templates & activity/i }).click();
    await expect(
        page.getByText('Recent Session Activity', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/group created/i)).toBeVisible({
        timeout: 5000,
    });
});

test('destroying a session makes the board disappear', async ({ page }) => {
    const s = await createSession(page);

    const res = await page.request.delete(
        `/admin/sessions/${s.sessionId}`,
        { headers: apiHeaders(s.xsrf, { 'X-Admin-Token': s.adminToken }) },
    );
    expect(res.ok()).toBeTruthy();

    // The board API 404s; the join page is gone.
    const board = await page.request.get(`/api/sessions/${s.code}/board`, {
        headers: { 'X-Device-Token': newDeviceToken() },
    });
    expect(board.status()).toBe(404);
    const join = await page.request.get(`/join/${s.code}`);
    expect(join.status()).toBe(404);
});
