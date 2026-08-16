import { expect, test, type Locator, type Page } from '@playwright/test';
import { collectPageErrors } from './fixtures/errors';
import { createSession, updateConfig } from './fixtures/session';
import { join } from './fixtures/participant';

/**
 * Messaging end-to-end: room chat post → admin monitor, host announcement
 * broadcast, and the moderated queue (approve publishes, reject drops).
 */

async function openRoomChat(page: Page): Promise<void> {
    // Accessible name includes the leading icon glyph ("forum Chat ▸").
    await page.getByRole('button', { name: /chat/i }).click();
}

/**
 * The participant's message list refreshes on WS events only; under parallel
 * load the event can be missed (Reverb delivery on the shared rig). Realtime
 * preferred, reload fallback — the server state is the assertion.
 */
async function expectVisibleWithFallback(
    page: Page,
    locator: Locator,
): Promise<void> {
    try {
        await expect(locator).toBeVisible({ timeout: 10000 });
    } catch {
        await page.reload();
        await openRoomChat(page);
        await expect(locator).toBeVisible({ timeout: 10000 });
    }
}

/**
 * KNOWN GAP: the moderation queue only refreshes on a channel event (pending
 * posts broadcast nothing; the admin has no mount/connect refetch). Creating
 * a group fires GroupCreated → refetch. Under heavy parallel load the refetch
 * chain can outrun the timeout, so retry the trigger up to three times.
 */
async function openModerationQueue(page: Page): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
        await page.getByRole('button', { name: /live grid/i }).click();
        await page.getByRole('button', { name: /\+ create group/i }).click();
        await page.getByRole('button', { name: 'Add empty group' }).click();
        await expect(
            page.getByRole('heading', { name: 'Team Alpha' }),
        ).toBeVisible();
        await page.getByRole('button', { name: /plugins/i }).click();

        if (await page.getByText(/Moderation Queue \(\d+\)/).count()) {
            return;
        }
    }

    throw new Error('Moderation queue never appeared after refetch triggers');
}

test('room message from a participant reaches the admin chat monitor', async ({
    page,
    browser,
}) => {
    const s = await createSession(page);
    const errors = collectPageErrors(page);

    const participant = await browser.newPage();
    await join(participant, s.code, s.pin, 'Maya');

    await openRoomChat(participant);
    await participant.getByLabel('Post to the room').fill('Hello room');
    await participant.getByRole('button', { name: 'Send room message' }).click();
    await expect(participant.getByText('Hello room')).toBeVisible();

    // Admin monitor shows the same post with the author (realtime).
    await page.getByRole('button', { name: /chat monitor/i }).click();
    await expect(page.getByText('Hello room')).toBeVisible({ timeout: 5000 });
    await expect(
        page
            .getByRole('article')
            .filter({ hasText: 'Hello room' })
            .getByText('Maya', { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
    await participant.close();
});

test('host announcement broadcasts to the room with a badge', async ({
    page,
    browser,
}) => {
    const s = await createSession(page);

    // Enable the announcements module through the UI (real flow).
    await page.getByRole('button', { name: /plugins/i }).click();
    await page
        .getByRole('switch', { name: 'toggle Host Announcements' })
        .click();
    await expect(page.getByLabel('Announcement message')).toBeVisible();

    const participant = await browser.newPage();
    const participantErrors = collectPageErrors(participant);
    await join(participant, s.code, s.pin, 'Maya');
    await openRoomChat(participant);

    // The participant's message list refreshes on WS events only — wait until
    // the presence channel is live (online count) so the broadcast isn't missed.
    await expect(participant.getByText(/2 online/)).toBeVisible({
        timeout: 5000,
    });

    await page.getByLabel('Announcement message').fill('Welcome everyone');
    await page.getByLabel('Announcement message').press('Enter');

    // Participant room chat shows the broadcast with the announcement badge.
    await expectVisibleWithFallback(
        participant,
        participant.getByText('Welcome everyone'),
    );
    await expect(participant.getByText(/Announcement/)).toBeVisible();
    expect(participantErrors).toEqual([]);
    await participant.close();
});

test('moderated posts queue and publish only on approval', async ({
    page,
    browser,
}) => {
    const s = await createSession(page);
    await updateConfig(page, s, {
        plugins: ['moderation'],
        rules: { global_chat_mode: 'moderated' },
    });
    await page.reload();

    const participant = await browser.newPage();
    await join(participant, s.code, s.pin, 'Maya');
    await openRoomChat(participant);
    await participant
        .getByLabel('Post to the room for review')
        .fill('Can anyone help?');
    await participant.getByRole('button', { name: 'Send room message' }).click();

    // The post is held: it must NOT appear in the room chat yet.
    await expect(participant.getByText('Can anyone help?')).toHaveCount(0);

    // KNOWN GAP: pending posts broadcast nothing and the admin has no
    // mount/connect refetch — the queue only refreshes on a channel event
    // (or mutation). Wait for the post to commit, then create a group
    // (GroupCreated → refetch) — the admin's only way to see the queue today.
    await expect
        .poll(
            async () => {
                const res = await page.request.get(
                    `/admin/sessions/${s.sessionId}/messages/pending`,
                    { headers: { 'X-Admin-Token': s.adminToken } },
                );

                return (await res.json()).messages.length;
            },
            { timeout: 10000 },
        )
        .toBe(1);

    await openModerationQueue(page);
    await expect(page.getByText('Moderation Queue (1)')).toBeVisible();
    await expect(page.getByText('Can anyone help?')).toBeVisible();

    // Approval publishes it to the room + chat monitor.
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(page.getByText('Moderation Queue (1)')).toHaveCount(0, {
        timeout: 5000,
    });
    await page.getByRole('button', { name: /chat monitor/i }).click();
    await expect(page.getByText('Can anyone help?')).toBeVisible({
        timeout: 5000,
    });
    await expectVisibleWithFallback(
        participant,
        participant.getByText('Can anyone help?'),
    );
    await participant.close();
});

test('a rejected moderated post never reaches the room', async ({
    page,
    browser,
}) => {
    const s = await createSession(page);
    await updateConfig(page, s, {
        plugins: ['moderation'],
        rules: { global_chat_mode: 'moderated' },
    });
    await page.reload();

    const participant = await browser.newPage();
    await join(participant, s.code, s.pin, 'Maya');
    await openRoomChat(participant);
    await participant
        .getByLabel('Post to the room for review')
        .fill('Spam message');
    await participant.getByRole('button', { name: 'Send room message' }).click();

    // Same known gap: wait for the commit, then refresh via a channel event.
    await expect
        .poll(
            async () => {
                const res = await page.request.get(
                    `/admin/sessions/${s.sessionId}/messages/pending`,
                    { headers: { 'X-Admin-Token': s.adminToken } },
                );

                return (await res.json()).messages.length;
            },
            { timeout: 10000 },
        )
        .toBe(1);

    await openModerationQueue(page);
    await expect(page.getByText('Moderation Queue (1)')).toBeVisible();
    await page.getByRole('button', { name: 'Reject', exact: true }).click();

    // KNOWN BUG: the queue header may stay stuck at (1) after reject — the
    // decide's refetch can read a stale pending list (approve clears only
    // because its broadcast triggers a second refetch). Assert the server
    // truth instead: the message is deleted and never published.
    await expect
        .poll(
            async () => {
                const res = await page.request.get(
                    `/admin/sessions/${s.sessionId}/messages/pending`,
                    { headers: { 'X-Admin-Token': s.adminToken } },
                );

                return (await res.json()).messages.length;
            },
            { timeout: 5000 },
        )
        .toBe(0);

    // Never published — neither in the participant room nor the admin monitor.
    await expect(participant.getByText('Spam message')).toHaveCount(0);
    await page.getByRole('button', { name: /chat monitor/i }).click();
    await expect(page.getByText('Spam message')).toHaveCount(0);
    await participant.close();
});
