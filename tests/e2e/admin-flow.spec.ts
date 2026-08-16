import { expect, test } from '@playwright/test';
import { createSession } from './fixtures/session';

/**
 * Admin god-mode flows: stats, freeze → join blocked, dissolve, CSV export,
 * group creation focus retention, and single/bulk group creation.
 */

test('admin panel shows QR, PIN, and live stats', { tag: '@smoke' }, async ({ page }) => {
    const { pin } = await createSession(page);

    await expect(page.getByText(/scan to join/i)).toBeVisible();
    await expect(page.getByText(pin).first()).toBeVisible();
    await expect(page.getByText('Freeze')).toBeVisible();
    await expect(page.getByText('Dissolve all')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
});

test('freeze blocks joins; unfreeze resumes', { tag: '@smoke' }, async ({ page, browser }) => {
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
    await expect(participant.getByLabel('Your name')).toBeVisible({
        timeout: 5000,
    });
    await participant.close();

    await page.getByRole('button', { name: 'Unfreeze', exact: true }).click();
    await expect(page.getByText('Freeze')).toBeVisible();
});

test('dissolve all returns everyone to the pool', { tag: '@smoke' }, async ({ page, browser }) => {
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

test('typing in the create-group dialog keeps focus in the active field', { tag: '@smoke' }, async ({
    page,
}) => {
    await createSession(page);
    await page.getByRole('button', { name: /\+ create group/i }).click();

    const nameInput = page.getByLabel('Group name');
    await nameInput.click();
    await nameInput.pressSequentially('Focus Test');

    await expect(nameInput).toBeFocused();
    await expect(
        page.getByRole('button', { name: 'Close dialog' }),
    ).not.toBeFocused();

    // Escape still closes the dialog
    await page.keyboard.press('Escape');
    await expect(nameInput).not.toBeVisible();
});

test('admin creates a single named group from the dialog', { tag: '@smoke' }, async ({ page }) => {
    await createSession(page);
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByLabel('Group name').fill('Facilitator Group');
    await page.getByRole('button', { name: 'Add empty group' }).click();

    await expect(
        page.getByRole('heading', { name: 'Facilitator Group' }),
    ).toBeVisible();
});

test('admin bulk-creates sequential groups and shows them on the board', { tag: '@smoke' }, async ({
    page,
}) => {
    await createSession(page);
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Create multiple' }).click();
    await page.getByLabel('Number of groups').fill('4');
    await page.getByRole('button', { name: 'Add empty group' }).click();

    await expect(
        page.getByRole('heading', { name: 'Team Alpha' }),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Team Bravo' }),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Team Charlie' }),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Team Delta' }),
    ).toBeVisible();
});

test('a named group can be created from the expanded bulk panel', { tag: '@smoke' }, async ({
    page,
}) => {
    await createSession(page);
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Create multiple' }).click();

    // Count 1 without random names keeps the manual name field usable
    await expect(page.getByLabel('Group name')).toBeVisible();
    await page.getByLabel('Group name').fill('Facilitator Group');
    await page.getByRole('button', { name: 'Add empty group' }).click();

    await expect(
        page.getByRole('heading', { name: 'Facilitator Group' }),
    ).toBeVisible();
});

test('closing the dialog resets bulk state for a later single submit', { tag: '@smoke' }, async ({
    page,
}) => {
    await createSession(page);
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Create multiple' }).click();
    await page.getByLabel('Number of groups').fill('4');
    await page.getByRole('button', { name: 'Add empty group' }).click();
    await expect(
        page.getByRole('heading', { name: 'Team Delta' }),
    ).toBeVisible();

    // The dialog auto-closed on success; reopening must start from count 1
    // with random names off, so a typed name creates exactly one group.
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByLabel('Group name').fill('Focus Group');
    await page.getByRole('button', { name: 'Add empty group' }).click();

    await expect(
        page.getByRole('heading', { name: 'Focus Group' }),
    ).toBeVisible();
    await expect(page.locator('h4')).toHaveCount(5);
});

test('an empty count shows the client-side error and sends no request', { tag: '@smoke' }, async ({
    page,
}) => {
    await createSession(page);

    let requests = 0;
    await page.route('**/admin/sessions/*/groups*', (route) => {
        requests++;

        route.continue().catch(() => {});
    });

    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Create multiple' }).click();
    await page.getByLabel('Number of groups').fill('');
    await page.getByRole('button', { name: 'Add empty group' }).click();

    await expect(
        page.getByText('Enter a number of groups between 1 and 200.'),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(requests).toBe(0);
});

test('bulk random names are distinct and not sequential', { tag: '@smoke' }, async ({ page }) => {
    await createSession(page);
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Create multiple' }).click();
    await page.getByLabel('Number of groups').fill('3');
    await page.getByLabel('Use random generated names').check();
    await page.getByRole('button', { name: 'Add empty group' }).click();

    await expect(page.locator('h4')).toHaveCount(3);

    const names = await page.locator('h4').allInnerTexts();

    expect(names).toHaveLength(3);
    expect(names.filter((name, i) => names.indexOf(name) === i)).toHaveLength(3);
    expect(names.every((name) => !name.startsWith('Team '))).toBe(true);
});

test('a failed bulk submission shows the error in the dialog', { tag: '@smoke' }, async ({
    page,
}) => {
    await createSession(page);
    await page.route('**/admin/sessions/*/groups/bulk', (route) =>
        route.fulfill({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Validation failed for count.' }),
        }),
    );

    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Create multiple' }).click();
    await page.getByLabel('Number of groups').fill('4');
    await page.getByRole('button', { name: 'Add empty group' }).click();

    await expect(page.getByText('Validation failed for count.')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
});

test('a stalled bulk request times out and releases the busy state', { tag: '@smoke' }, async ({
    page,
}) => {
    await createSession(page);
    await page.route('**/admin/sessions/*/groups/bulk', async (route) => {
        const { promise, resolve } = Promise.withResolvers<void>();
        setTimeout(resolve, 15000);
        await promise;
        await route
            .fulfill({
                status: 500,
                contentType: 'application/json',
                body: '{}',
            })
            .catch(() => {});
    });

    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Create multiple' }).click();
    await page.getByLabel('Number of groups').fill('4');
    await page.getByRole('button', { name: 'Add empty group' }).click();

    await expect(
        page.getByRole('button', { name: /creating/i }),
    ).toBeDisabled();

    // Escape must not close the dialog while a request is in flight
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();

    await expect(page.getByText(/timed out/i)).toBeVisible({
        timeout: 15000,
    });
    await expect(
        page.getByRole('button', { name: 'Add empty group' }),
    ).toBeEnabled();
});

test('clicking a participant opens the action chooser modal', { tag: '@smoke' }, async ({
    page,
    browser,
}) => {
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

    // Everyone back to the pool so the chip is clickable.
    await page.getByRole('button', { name: 'Dissolve all' }).click();
    await expect(page.getByText(/unassigned pool \(1\)/i)).toBeVisible();

    // Clicking the person opens the chooser — no inline move/role/ban buttons.
    await page.getByRole('button', { name: 'Actions for Maya' }).click();
    await expect(
        page.getByRole('heading', { name: 'Participant actions' }),
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: /^Move/ }),
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: /^Assign role/ }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Ban/ })).toBeVisible();

    // Choosing an action reveals its controls.
    await page.getByRole('button', { name: /^Move/ }).click();
    await expect(page.getByText('Destination', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await a.close();
});

test('saving session rules works and group size offers exact and range', { tag: '@smoke' }, async ({
    page,
}) => {
    await createSession(page);
    await page.getByRole('button', { name: 'Configuration' }).click();

    // Group size defaults to Range (default rules are 3–6).
    await expect(page.getByText('Group size', { exact: true })).toBeVisible();
    await expect(
        page.getByRole('radio', { name: /^range/i }),
    ).toBeChecked();
    await expect(page.getByText('Minimum', { exact: true })).toBeVisible();
    await expect(page.getByText('Maximum', { exact: true })).toBeVisible();

    // Exact mode swaps the min/max sliders for a single number field.
    await page.getByRole('radio', { name: /exact size/i }).click();
    await expect(page.getByLabel(/team size/i)).toBeVisible();

    // Saving rules goes out as PUT (405 regression guard).
    const saveResponse = page.waitForResponse(
        (response) =>
            response.url().includes('/admin/sessions/') &&
            response.url().endsWith('/config') &&
            response.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Save Rules' }).click();
    expect((await saveResponse).status()).toBe(200);
});
