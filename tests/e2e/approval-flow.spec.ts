import { expect, test } from '@playwright/test';
import { apiHeaders } from './fixtures/xsrf';
import { createSession, updateConfig } from './fixtures/session';
import {
    createGroupViaApi,
    fetchBoard,
    joinViaApi,
    newDeviceToken,
    openParticipantView,
} from './fixtures/participant';

/**
 * Approval-queue flow (CAP-4): request-to-join → leader approves → seated.
 */
test('approval-mode join: request, approve, seat', { tag: '@smoke' }, async ({ page }) => {
    const s = await createSession(page);
    await updateConfig(page, s, { rules: { join_mode: 'approval' } });

    const tokenA = newDeviceToken();
    const tokenB = newDeviceToken();
    await joinViaApi(page, s, 'Maya', tokenA);
    await createGroupViaApi(page, s, tokenA);
    const boardA = await fetchBoard(page, s.code, tokenA);
    const gid = boardA.groups[0].id as number;

    // Leo requests to join the group (approval mode → pending).
    await joinViaApi(page, s, 'Leo', tokenB);
    await page.request.post(`/s/${s.code}/groups/${gid}/join`, {
        headers: apiHeaders(s.xsrf, { 'X-Device-Token': tokenB }),
        data: {},
    });

    // Maya (leader) sees the pending request and approves it.
    await openParticipantView(page, s.code, tokenA);
    await expect(page.getByText('Leo')).toBeVisible({ timeout: 5000 });

    // Leader board shows the pending request with an approve action.
    const approve = page.getByRole('button', { name: /approve/i });
    await expect(approve).toBeVisible({ timeout: 5000 });
    await approve.click();

    // Seated: Leo is now an active member of the group.
    await expect
        .poll(async () => {
            const b = await fetchBoard(page, s.code, tokenA);
            const g = b.groups.find((x: { id: number }) => x.id === gid);
            return g?.members.some(
                (m: { name: string; role: string }) =>
                    m.name === 'Leo' && m.role === 'member',
            );
        }, { timeout: 5000 })
        .toBe(true);
});
