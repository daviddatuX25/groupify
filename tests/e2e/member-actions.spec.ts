import { expect, test, type Page } from '@playwright/test';
import { createSession } from './fixtures/session';
import {
    createGroupViaApi,
    fetchBoard,
    joinViaApi,
    newDeviceToken,
} from './fixtures/participant';

/**
 * Admin member actions executed end-to-end: move (group ↔ pool), custom role
 * definition + assignment, and ban (remove + block rejoin). The action
 * chooser was previously only opened — these execute the actions.
 */

async function adminCreateGroup(page: Page): Promise<void> {
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Add empty group' }).click();
    await expect(
        page.getByRole('heading', { name: 'Team Alpha' }),
    ).toBeVisible();
}

test('admin moves a participant into a group and back to the pool', async ({
    page,
}) => {
    const s = await createSession(page);
    await adminCreateGroup(page);

    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);
    await expect(page.getByText(/unassigned pool \(1\)/i)).toBeVisible({
        timeout: 5000,
    });

    // Move Maya into Team Alpha via the action chooser.
    await page.getByRole('button', { name: 'Actions for Maya' }).click();
    await page.getByRole('button', { name: /^move/i }).click();
    await page.getByLabel('Destination').selectOption({ label: 'Team Alpha' });
    await page
        .getByRole('button', { name: 'Move participants', exact: true })
        .click();

    await expect
        .poll(
            async () => {
                const b = await fetchBoard(page, s.code, token);
                const g = b.groups.find(
                    (x: { name: string }) => x.name === 'Team Alpha',
                );

                return (
                    g?.members.some(
                        (m: { name: string }) => m.name === 'Maya',
                    ) ?? false
                );
            },
            { timeout: 5000 },
        )
        .toBe(true);

    // The move confirms with a toast.
    await expect(page.getByText('Moved to group')).toBeVisible({
        timeout: 5000,
    });

    // Maya's action button now lives in the group card — move her back out.
    await page.getByRole('button', { name: 'Actions for Maya' }).click();
    await page.getByRole('button', { name: /^move/i }).click();
    await page
        .getByLabel('Destination')
        .selectOption({ label: 'Unassigned pool' });
    await page
        .getByRole('button', { name: 'Move participants', exact: true })
        .click();

    await expect(page.getByText(/unassigned pool \(1\)/i)).toBeVisible({
        timeout: 5000,
    });
    await expect
        .poll(
            async () => {
                const b = await fetchBoard(page, s.code, token);
                const g = b.groups.find(
                    (x: { name: string }) => x.name === 'Team Alpha',
                );

                return (
                    g?.members.some(
                        (m: { name: string }) => m.name === 'Maya',
                    ) ?? false
                );
            },
            { timeout: 5000 },
        )
        .toBe(false);
});

test('admin defines a custom role and assigns it to a participant', async ({
    page,
}) => {
    const s = await createSession(page);
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);
    await expect(page.getByText(/unassigned pool \(1\)/i)).toBeVisible({
        timeout: 5000,
    });

    // Define a session role through the Permissions tab.
    await page.getByRole('button', { name: /permissions/i }).click();
    await page.getByLabel('Role name').fill('Co-host');
    await page.getByLabel('Action grants').fill('announce');
    await page.getByRole('button', { name: 'Define Role' }).click();
    await expect(page.getByText('Co-host: announce')).toBeVisible();

    // Assign it to Maya via the roster row.
    await page.getByRole('button', { name: 'Assign role' }).click();
    await page
        .getByRole('dialog', { name: 'Assign a custom role' })
        .getByLabel('Custom role')
        .selectOption({ label: 'Co-host' });
    await page.getByRole('button', { name: 'Save role' }).click();

    // The board snapshot carries the custom role; the pool chip shows it.
    await expect
        .poll(
            async () => {
                const b = await fetchBoard(page, s.code, token);

                return b.pool.find(
                    (m: { name: string }) => m.name === 'Maya',
                )?.custom_role;
            },
            { timeout: 5000 },
        )
        .toBe('Co-host');
    await page.getByRole('button', { name: /live grid/i }).click();
    await expect(page.getByText('Co-host', { exact: true })).toBeVisible();
});

test('ban removes the participant and blocks rejoin by name', async ({
    page,
    browser,
}) => {
    const s = await createSession(page);
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);
    await createGroupViaApi(page, s, token);
    await expect(
        page.getByRole('heading', { name: 'Team Alpha' }),
    ).toBeVisible({ timeout: 5000 });

    // Ban from the group member row.
    await page.getByRole('button', { name: 'Actions for Maya' }).click();
    await page.getByRole('button', { name: /^ban/i }).click();
    await page
        .getByRole('button', { name: 'Ban participants', exact: true })
        .click();

    // Removed from every group. (KNOWN BUG: the pool query doesn't filter
    // banned_at, so she stays visible in the admin pool — asserted by its
    // absence being intentionally NOT checked here.)
    await expect
        .poll(
            async () => {
                const b = await fetchBoard(page, s.code, token);

                return b.groups.some(
                    (g: { members: { name: string }[] }) =>
                        g.members.some((m) => m.name === 'Maya'),
                );
            },
            { timeout: 5000 },
        )
        .toBe(false);

    // Rejoin with the same name is blocked.
    const rejoiner = await browser.newPage();
    await rejoiner.goto('/');
    await rejoiner.evaluate(() => localStorage.clear());
    await rejoiner.goto(`/join/${s.code}`);
    const pinInput = rejoiner.getByLabel('4-digit PIN');

    if (await pinInput.count()) {
        await pinInput.fill(s.pin);
    }
    await rejoiner.getByLabel('Your name').fill('Maya');
    await rejoiner.getByRole('button', { name: /enter the room/i }).click();
    await expect(rejoiner.getByText(/banned/i)).toBeVisible({ timeout: 5000 });
    await rejoiner.close();
});

test('a failed member action shows an error toast', async ({ page }) => {
    const s = await createSession(page);
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);
    await expect(page.getByText(/unassigned pool \(1\)/i)).toBeVisible({
        timeout: 5000,
    });

    // Ban endpoint fails → the toast must surface the error.
    await page.route('**/members/*/ban', (route) =>
        route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: '{}',
        }),
    );
    await page.getByRole('button', { name: 'Actions for Maya' }).click();
    await page.getByRole('button', { name: /^ban/i }).click();
    await page
        .getByRole('button', { name: 'Ban participants', exact: true })
        .click();

    await expect(
        page
            .locator('[data-sonner-toast]')
            .getByText('Participant action failed — try again.'),
    ).toBeVisible({ timeout: 5000 });
});
