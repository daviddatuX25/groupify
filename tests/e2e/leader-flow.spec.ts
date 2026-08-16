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
 * Leader flows: kick a member back to the pool, reject a join request in
 * approval mode, and leadership transfer.
 *
 * KNOWN GAP: leadership transfer has no UI (route + controller only) — the
 * transfer test pins the server contract via the admin API.
 */

test('leader kicks a member back to the pool', async ({ page }) => {
    const s = await createSession(page);
    const tokenA = newDeviceToken();
    const tokenB = newDeviceToken();
    await joinViaApi(page, s, 'Maya', tokenA);
    await createGroupViaApi(page, s, tokenA);
    const boardA = await fetchBoard(page, s.code, tokenA);
    const gid = boardA.groups[0].id as number;

    await joinViaApi(page, s, 'Leo', tokenB);
    await page.request.post(`/s/${s.code}/groups/${gid}/join`, {
        headers: apiHeaders(s.xsrf, { 'X-Device-Token': tokenB }),
        data: {},
    });

    // Maya (leader) sees Leo with a kick action.
    await openParticipantView(page, s.code, tokenA);
    await expect(page.getByRole('button', { name: 'kick', exact: true })).toBeVisible(
        { timeout: 5000 },
    );
    await page.getByRole('button', { name: 'kick', exact: true }).click();

    // Leo is back in the pool, out of the group.
    await expect
        .poll(
            async () => {
                const b = await fetchBoard(page, s.code, tokenA);
                const g = b.groups.find(
                    (x: { id: number }) => x.id === gid,
                );
                const inGroup =
                    g?.members.some(
                        (m: { name: string }) => m.name === 'Leo',
                    ) ?? false;
                const inPool = b.pool.some(
                    (m: { name: string }) => m.name === 'Leo',
                );

                return { inGroup, inPool };
            },
            { timeout: 5000 },
        )
        .toEqual({ inGroup: false, inPool: true });
});

test('leader rejects a join request in approval mode', async ({ page }) => {
    const s = await createSession(page);
    await updateConfig(page, s, { rules: { join_mode: 'approval' } });

    const tokenA = newDeviceToken();
    const tokenB = newDeviceToken();
    await joinViaApi(page, s, 'Maya', tokenA);
    await createGroupViaApi(page, s, tokenA);
    const boardA = await fetchBoard(page, s.code, tokenA);
    const gid = boardA.groups[0].id as number;

    await joinViaApi(page, s, 'Leo', tokenB);
    await page.request.post(`/s/${s.code}/groups/${gid}/join`, {
        headers: apiHeaders(s.xsrf, { 'X-Device-Token': tokenB }),
        data: {},
    });

    // Maya sees the pending request and rejects it.
    await openParticipantView(page, s.code, tokenA);
    await expect(page.getByRole('button', { name: 'reject Leo' })).toBeVisible({
        timeout: 5000,
    });
    await page.getByRole('button', { name: 'reject Leo' }).click();

    // The pending request is gone; Leo stays in the pool.
    await expect(page.getByText('Pending Join Requests')).toHaveCount(0, {
        timeout: 5000,
    });
    await expect
        .poll(
            async () => {
                const b = await fetchBoard(page, s.code, tokenA);
                const g = b.groups.find(
                    (x: { id: number }) => x.id === gid,
                );

                return {
                    pending: g?.pending?.length ?? 0,
                    leoInGroup:
                        g?.members.some(
                            (m: { name: string }) => m.name === 'Leo',
                        ) ?? false,
                    leoInPool: b.pool.some(
                        (m: { name: string }) => m.name === 'Leo',
                    ),
                };
            },
            { timeout: 5000 },
        )
        .toEqual({ pending: 0, leoInGroup: false, leoInPool: true });
});

test('leadership transfers to an active member via the admin API', async ({
    page,
}) => {
    const s = await createSession(page);
    const tokenA = newDeviceToken();
    const tokenB = newDeviceToken();
    await joinViaApi(page, s, 'Maya', tokenA);
    await createGroupViaApi(page, s, tokenA);
    const boardA = await fetchBoard(page, s.code, tokenA);
    const gid = boardA.groups[0].id as number;

    await joinViaApi(page, s, 'Leo', tokenB);
    await page.request.post(`/s/${s.code}/groups/${gid}/join`, {
        headers: apiHeaders(s.xsrf, { 'X-Device-Token': tokenB }),
        data: {},
    });
    const boardB = await fetchBoard(page, s.code, tokenB);
    const leo = boardB.groups
        .find((g: { id: number }) => g.id === gid)
        .members.find((m: { name: string }) => m.name === 'Leo');

    const res = await page.request.post(
        `/admin/sessions/${s.sessionId}/groups/${gid}/leader`,
        {
            headers: apiHeaders(s.xsrf, { 'X-Admin-Token': s.adminToken }),
            data: { participant_id: leo.id },
        },
    );
    expect(res.ok()).toBeTruthy();

    // Leo is the leader; Maya's group card loses the kick affordance's
    // privilege (Leo now owns it) and the board shows the new leader_id.
    await expect
        .poll(
            async () => {
                const b = await fetchBoard(page, s.code, tokenB);
                const g = b.groups.find(
                    (x: { id: number }) => x.id === gid,
                );

                return {
                    leaderId: g?.leader_id,
                    leoRole: g?.members.find(
                        (m: { name: string }) => m.name === 'Leo',
                    )?.role,
                    mayaRole: g?.members.find(
                        (m: { name: string }) => m.name === 'Maya',
                    )?.role,
                };
            },
            { timeout: 5000 },
        )
        .toEqual({ leaderId: leo.id, leoRole: 'leader', mayaRole: 'member' });
});
