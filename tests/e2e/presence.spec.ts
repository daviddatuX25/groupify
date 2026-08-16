import { expect, test } from '@playwright/test';
import { createSession } from './fixtures/session';
import { join, newDeviceToken } from './fixtures/participant';

/**
 * FR-3.5 online presence: the header count reflects LIVE connections
 * (presence channel members), not just joined seats.
 */
test('live presence count reflects connected browsers', { tag: '@smoke' }, async ({ page, browser }) => {
    const s = await createSession(page);

    // Admin browser is already on the presence channel (count starts at 1).
    await expect(page.getByText(/1 online/)).toBeVisible({ timeout: 5000 });

    // A participant joins from a second browser → both see 2 online.
    const second = await browser.newPage();
    const token = newDeviceToken();
    await join(second, s.code, s.pin, 'Maya', { deviceToken: token });
    await second.waitForURL(/\/s\/\d{6}/);

    await expect(page.getByText(/2 online/)).toBeVisible({ timeout: 5000 });
    await expect(second.getByText(/2 online/)).toBeVisible({ timeout: 5000 });

    // Closing the participant browser drops the live count back to 1.
    await second.close();
    await expect(page.getByText(/1 online/)).toBeVisible({ timeout: 5000 });
});
