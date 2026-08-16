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
 * CAP-3 propagation: a membership change must reach other clients in ~1s.
 * Realtime path only (no reload fallback). The visibility timeout is the
 * single deadline — the elapsed number is logged for the performance record.
 */
test('realtime propagation latency stays under 2s', { tag: '@smoke' }, async ({ page }) => {
    const s = await createSession(page);

    const tokenA = newDeviceToken();
    const tokenB = newDeviceToken();
    await joinViaApi(page, s, 'Maya', tokenA);
    await joinViaApi(page, s, 'Leo', tokenB);

    // Maya creates a group; Leo joins it; measure until Maya's board reflects it.
    const consoleLogs: string[] = [];
    page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') {
            consoleLogs.push(m.text());
        }
    });
    page.on('pageerror', (e) => consoleLogs.push('PAGEERROR: ' + String(e)));
    await openParticipantView(page, s.code, tokenA);
    await page.getByRole('button', { name: /create new group/i }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Team Alpha' })).toBeVisible();

    const boardA = await fetchBoard(page, s.code, tokenA);
    const gid = boardA.groups[0].id as number;

    await page.waitForTimeout(1000); // brief settle for the WS subscription

    // Start the clock AFTER the join POST resolves: the visibility timeout is
    // the single deadline — no double accounting of POST/clock overhead.
    await page.request.post(`/s/${s.code}/groups/${gid}/join`, {
        headers: apiHeaders(s.xsrf, { 'X-Device-Token': tokenB }),
        data: {},
    });
    const started = Date.now();

    // Realtime only: Leo must appear on Maya's board without a reload.
    await expect(page.getByText('Leo')).toBeVisible({ timeout: 2000 }).catch(async () => {
        console.log('CONSOLE:', JSON.stringify(consoleLogs));
        console.log('BODY:', (await page.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n/g, ' | '));
        throw new Error('realtime propagation failed');
    });
    const elapsed = Date.now() - started;
    console.log(`propagation: ${elapsed}ms (CAP-3 nominal 1000ms; CI budget 2000ms)`);
});
