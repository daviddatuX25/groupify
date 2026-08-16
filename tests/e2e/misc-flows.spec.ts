import { expect, test } from '@playwright/test';
import { createSession, updateConfig } from './fixtures/session';
import {
    fetchBoard,
    joinViaApi,
    newDeviceToken,
    openParticipantView,
} from './fixtures/participant';

/**
 * Remaining flows: seat check + auto-rejoin, match-me, auto-distribute, and
 * proxy seats (pre-registered names claimed on join).
 */

test('seat check resolves the device and auto-rejoin skips the form', async ({
    page,
}) => {
    const s = await createSession(page);
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);

    // Seat endpoint: known token resolves, unknown does not.
    const known = await (
        await page.request.get(`/join/${s.code}/seat?token=${token}`)
    ).json();
    expect(known).toEqual({ seat: true, name: 'Maya' });
    const unknown = await (
        await page.request.get(
            `/join/${s.code}/seat?token=${newDeviceToken()}`,
        )
    ).json();
    expect(unknown).toEqual({ seat: false, name: null });

    // A returning device lands straight in its seat without the form.
    await openParticipantView(page, s.code, token);
    await page.goto(`/join/${s.code}`);
    await expect(page).toHaveURL(new RegExp(`/s/${s.code}`), {
        timeout: 10000,
    });
    await expect(page.getByText('Maya (You)')).toBeVisible();
});

test('match me places a pooled participant into an open group', async ({
    page,
}) => {
    const s = await createSession(page);
    await updateConfig(page, s, { plugins: ['match_me'] });
    await page.reload();

    // Admin creates the target group.
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Add empty group' }).click();
    await expect(
        page.getByRole('heading', { name: 'Team Alpha' }),
    ).toBeVisible();

    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);
    await openParticipantView(page, s.code, token);
    await expect(page.getByRole('button', { name: 'Match me' })).toBeVisible({
        timeout: 5000,
    });
    await page.getByRole('button', { name: 'Match me' }).click();

    // Maya is now a member of Team Alpha.
    await expect(page.getByText(/you.?re in Team Alpha/)).toBeVisible({
        timeout: 5000,
    });
    await expect
        .poll(async () => {
            const b = await fetchBoard(page, s.code, token);
            const g = b.groups.find(
                (x: { name: string }) => x.name === 'Team Alpha',
            );

            return (
                g?.members.some((m: { name: string }) => m.name === 'Maya') ??
                false
            );
        }, { timeout: 5000 })
        .toBe(true);
});

test('auto-distribute seats every pooled participant', async ({ page }) => {
    const s = await createSession(page);

    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Add empty group' }).click();
    await expect(
        page.getByRole('heading', { name: 'Team Alpha' }),
    ).toBeVisible();

    const tokens = [newDeviceToken(), newDeviceToken(), newDeviceToken()];
    for (const [i, t] of tokens.entries()) {
        await joinViaApi(page, s, `P${i + 1}`, t);
    }
    await expect(page.getByText(/unassigned pool \(3\)/i)).toBeVisible({
        timeout: 5000,
    });

    await page
        .getByRole('button', { name: 'Auto-Distribute', exact: true })
        .click();

    await expect
        .poll(
            async () => {
                const b = await fetchBoard(page, s.code, tokens[0]);

                return {
                    pool: b.pool.length,
                    members: b.groups.reduce(
                        (n: number, g: { members: unknown[] }) =>
                            n + g.members.length,
                        0,
                    ),
                };
            },
            { timeout: 5000 },
        )
        .toEqual({ pool: 0, members: 3 });
});

test('proxy seats pre-register names that are claimed on join', async ({
    page,
    browser,
}) => {
    // The flow does several sequential SQLite writes; under parallel-suite
    // load a write can wait out the 30s busy-timeout (single-box rig).
    test.setTimeout(60000);
    const s = await createSession(page);
    await updateConfig(page, s, { plugins: ['proxy'] });
    await page.reload();

    // Register two names from the Plugins tab.
    await page.getByRole('button', { name: /plugins/i }).click();
    await page.getByLabel('Names to pre-register').fill('Alex\nSam');
    await page.getByRole('button', { name: 'Create Seats' }).click();
    await page.getByRole('button', { name: /live grid/i }).click();
    await expect(page.getByText(/unassigned pool \(2\)/i)).toBeVisible({
        timeout: 5000,
    });
    await expect(page.getByText('Alex', { exact: true })).toBeVisible();

    // A real participant joining as Alex claims the pre-registered seat.
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Alex', token);
    await openParticipantView(page, s.code, token);
    await expect(page.getByText('Alex (You)')).toBeVisible({ timeout: 5000 });
    await browser.close();
});
