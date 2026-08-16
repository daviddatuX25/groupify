import { expect, test } from '@playwright/test';
import { apiHeaders } from './fixtures/xsrf';
import { createSession } from './fixtures/session';
import {
    fetchBoard,
    joinViaApi,
    newDeviceToken,
    openParticipantView,
} from './fixtures/participant';

/**
 * Profile customization (PATCH /s/{code}/profile).
 *
 * KNOWN GAP: AvatarProfileDialog exists but no page renders it and no UI
 * calls the endpoint — the feature is unwired on the frontend. These specs
 * pin the server contract; wiring the dialog is a separate feature task.
 */

test('avatar update persists on the participant identity', async ({
    page,
}) => {
    const s = await createSession(page);
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);

    const res = await page.request.patch(`/s/${s.code}/profile`, {
        headers: apiHeaders(s.xsrf, { 'X-Device-Token': token }),
        data: { avatar_style: 'lorelei', avatar_seed: 'neon-dream' },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({
        ok: true,
        avatar: { style: 'lorelei', seed: 'neon-dream' },
    });

    // The board reflects the new avatar for the participant.
    await expect
        .poll(async () => {
            const b = await fetchBoard(page, s.code, token);

            return b.me?.avatar;
        }, { timeout: 5000 })
        .toEqual({ style: 'lorelei', seed: 'neon-dream' });

    // A fresh visit (auto-rejoin) still carries the saved avatar.
    await openParticipantView(page, s.code, token);
    await expect
        .poll(async () => {
            const b = await fetchBoard(page, s.code, token);

            return b.me?.avatar;
        }, { timeout: 5000 })
        .toEqual({ style: 'lorelei', seed: 'neon-dream' });
});

test('profile update rejects an unknown avatar style', async ({ page }) => {
    const s = await createSession(page);
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);

    const res = await page.request.patch(`/s/${s.code}/profile`, {
        headers: apiHeaders(s.xsrf, { 'X-Device-Token': token }),
        data: { avatar_style: 'not-a-style', avatar_seed: 'x' },
    });
    expect(res.status()).toBe(422);

    // The stored avatar is unchanged.
    const b = await fetchBoard(page, s.code, token);
    expect(b.me?.avatar).toEqual({ style: 'initials', seed: expect.any(String) });
});
