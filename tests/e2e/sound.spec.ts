import { expect, test } from '@playwright/test';
import { createSession } from './fixtures/session';
import { joinViaApi, newDeviceToken, openParticipantView } from './fixtures/participant';

/**
 * UI sound system (snd-lib): asserts the imperative play() calls fire on the
 * right events via the window hook (headless CI has no audio output) and
 * that the mute toggle silences + persists.
 */

function lastSound(page: Parameters<typeof test>[0]['page']): Promise<string | undefined> {
    return page.evaluate(() => (window as Window & { __groupifyLastSound?: string }).__groupifyLastSound);
}

test('group creation plays a celebration sound', async ({ page }) => {
    const s = await createSession(page);
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);
    await openParticipantView(page, s.code, token);

    await page.getByRole('button', { name: /create new group/i }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Team Alpha' })).toBeVisible({
        timeout: 5000,
    });

    // The success path plays celebration (sprite loads async — poll).
    await expect.poll(() => lastSound(page), { timeout: 10000 }).toBe('celebration');
});

test('a failed admin action plays a caution sound', async ({ page }) => {
    const s = await createSession(page);
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);
    await expect(page.getByText(/unassigned pool \(1\)/i)).toBeVisible({
        timeout: 5000,
    });

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
    await expect.poll(() => lastSound(page), { timeout: 5000 }).toBe('caution');
});

test('the mute toggle silences sounds and persists', async ({ page }) => {
    const s = await createSession(page);

    await page.getByRole('button', { name: 'Mute sounds' }).click();
    await expect(page.getByRole('button', { name: 'Enable sounds' })).toBeVisible();
    expect(
        await page.evaluate(() => localStorage.getItem('groupify.sound_enabled')),
    ).toBe('off');

    // A success action must NOT reach the sound hook while muted.
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Add empty group' }).click();
    await expect(page.getByRole('heading', { name: 'Team Alpha' })).toBeVisible({
        timeout: 5000,
    });
    expect(await lastSound(page)).toBeUndefined();

    // Unmute restores sounds on the next action.
    await page.getByRole('button', { name: 'Enable sounds' }).click();
    await page.getByRole('button', { name: /\+ create group/i }).click();
    await page.getByRole('button', { name: 'Add empty group' }).click();
    await expect(page.getByRole('heading', { name: 'Team Bravo' })).toBeVisible({
        timeout: 5000,
    });
    await expect.poll(() => lastSound(page), { timeout: 10000 }).toBe('celebration');
});
