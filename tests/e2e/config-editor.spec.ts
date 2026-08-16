import { expect, test } from '@playwright/test';
import { createSession } from './fixtures/session';
import {
    fetchBoard,
    joinViaApi,
    newDeviceToken,
    openParticipantView,
} from './fixtures/participant';

/**
 * Config editor surfaces: guest list enforcement, custom required fields at
 * group creation, and the auto-dissolve toggle.
 */

test('guest list restricts who can join the session', async ({ page }) => {
    const s = await createSession(page);

    await page.getByRole('button', { name: 'Configuration' }).click();
    await page.getByText('Guest list', { exact: true }).fill('Alice');
    await page.getByRole('button', { name: 'Save Rules' }).click();

    // Save Rules is fire-and-forget — wait until the server holds the list.
    await expect
        .poll(async () => {
            const res = await page.request.get(`/api/sessions/${s.code}/board`, {
                headers: { 'X-Admin-Token': s.adminToken },
            });
            const b = await res.json();

            return b.config?.rules?.guest_list;
        }, { timeout: 5000 })
        .toEqual(['Alice']);

    // A name outside the list is rejected at the join form.
    const blocked = newDeviceToken();
    const blockedRes = await page.request.post(`/join/${s.code}`, {
        headers: {
            'X-Device-Token': blocked,
            'X-XSRF-TOKEN': s.xsrf,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        data: { name: 'Bob', device_token: blocked },
    });
    expect(blockedRes.status()).toBe(422);
    expect(await blockedRes.text()).toContain('not on the guest list');

    // A listed name joins normally.
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Alice', token);
    await openParticipantView(page, s.code, token);
    await expect(page.getByText('Alice (You)')).toBeVisible();
});

test('a required custom field gates group creation', async ({ page }) => {
    const s = await createSession(page);

    await page.getByRole('button', { name: 'Configuration' }).click();
    await page.getByLabel('New field name').fill('Chosen topic');
    await page.getByRole('button', { name: '+ Add Field' }).click();
    await page.getByText('Required', { exact: true }).click();
    await page.getByRole('button', { name: 'Save Fields' }).click();

    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);
    await openParticipantView(page, s.code, token);
    await page.getByRole('button', { name: /create new group/i }).click();

    // The field is required — the browser blocks the empty submit.
    const field = page.getByLabel(/chosen topic/i);
    await expect(field).toBeVisible();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Team Alpha' })).toHaveCount(
        0,
        { timeout: 2000 },
    );

    // Filling it creates the group with the value on the board.
    await field.fill('AI');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Team Alpha' })).toBeVisible(
        { timeout: 5000 },
    );
    await expect
        .poll(async () => {
            const b = await fetchBoard(page, s.code, token);

            return b.groups[0]?.field_values;
        }, { timeout: 5000 })
        .toEqual({ 'Chosen topic': 'AI' });
});

test('auto-dissolve toggle persists the interval in the config', async ({
    page,
}) => {
    const s = await createSession(page);

    await page.getByRole('button', { name: 'Configuration' }).click();
    await page.getByText('Auto-dissolve', { exact: true }).click();
    await page.getByRole('button', { name: 'Save Rules' }).click();

    await expect
        .poll(async () => {
            const res = await page.request.get(`/api/sessions/${s.code}/board`, {
                headers: { 'X-Admin-Token': s.adminToken },
            });
            const b = await res.json();

            return b.config?.rules?.auto_dissolve_minutes;
        }, { timeout: 5000 })
        .toBe(10);
});

test('clearing the team size field lets a new number be typed', async ({
    page,
}) => {
    const s = await createSession(page);

    await page.getByRole('button', { name: 'Configuration' }).click();
    await page.getByRole('radio', { name: /exact size/i }).click();

    // The exact-size input starts at the default min (3).
    const sizeInput = page.getByLabel('Team size');
    await expect(sizeInput).toHaveValue('3');

    // User flow: select all, delete, type a new number. The empty state
    // must NOT snap back to the old value mid-typing.
    await sizeInput.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await sizeInput.pressSequentially('9');

    await page.getByRole('button', { name: 'Save Rules' }).click();
    await expect
        .poll(async () => {
            const res = await page.request.get(`/api/sessions/${s.code}/board`, {
                headers: { 'X-Admin-Token': s.adminToken },
            });
            const b = await res.json();

            return {
                min: b.config?.rules?.min_members,
                max: b.config?.rules?.max_members,
            };
        }, { timeout: 5000 })
        .toEqual({ min: 9, max: 9 });
});

test('clearing the quiz points field lets a new value be typed', async ({
    page,
}) => {
    const s = await createSession(page);
    await page.request.put(`/admin/sessions/${s.sessionId}/config`, {
        headers: {
            'X-Admin-Token': s.adminToken,
            'X-XSRF-TOKEN': s.xsrf,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        data: { plugins: ['quiz'] },
    });
    await page.reload();
    await page.getByRole('button', { name: /plugins/i }).click();

    const points = page.getByLabel('points');
    await expect(points).toHaveValue('10');

    // The save drops blank questions — give it a real one first.
    await page.getByLabel('Question 1').fill('Capital of France?');
    await page.getByLabel('Option 1').fill('Paris');
    await page.getByLabel('Option 2').fill('Lyon');

    // Same user flow as the team-size bug: clear, then type a new number.
    await points.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await points.pressSequentially('25');

    await page.getByRole('button', { name: 'Save Quiz' }).click();
    await expect
        .poll(async () => {
            const res = await page.request.get(`/api/sessions/${s.code}/board`, {
                headers: { 'X-Admin-Token': s.adminToken },
            });
            const b = await res.json();

            return b.config?.quiz?.questions?.[0]?.points;
        }, { timeout: 5000 })
        .toBe(25);
});
