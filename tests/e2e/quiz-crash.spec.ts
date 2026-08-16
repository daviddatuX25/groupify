import { test, expect } from '@playwright/test';
import { apiHeaders } from './fixtures/xsrf';
import { createSession, updateConfig } from './fixtures/session';
import {
    collectPageErrors,
} from './fixtures/errors';
import {
    createGroupViaApi,
    fetchBoard,
    joinViaApi,
    newDeviceToken,
    openParticipantView,
} from './fixtures/participant';

test('participant page renders a live quiz without crashing', { tag: '@smoke' }, async ({ page }) => {
    const s = await createSession(page);

    // The quiz is an optional extension (flexibility-model.md §3) — enable it first.
    await updateConfig(page, s, { plugins: ['quiz'] });
    await page.request.put(`/admin/sessions/${s.sessionId}/quiz`, {
        headers: apiHeaders(s.xsrf, { 'X-Admin-Token': s.adminToken }),
        data: {
            questions: [
                { q: 'Capital of France?', options: ['Paris', 'Lyon'], answer: 0, points: 10 },
            ],
        },
    });

    // Participant joins, forms a group, quiz goes live.
    const token = newDeviceToken();
    await joinViaApi(page, s, 'Maya', token);
    await createGroupViaApi(page, s, token);
    await page.request.post(`/admin/sessions/${s.sessionId}/quiz/start`, {
        headers: apiHeaders(s.xsrf, { 'X-Admin-Token': s.adminToken }),
    });

    // The participant page must render the live quiz without crashing.
    const errors = collectPageErrors(page);
    await openParticipantView(page, s.code, token);
    await expect(page.getByText('Capital of France?')).toBeVisible({ timeout: 10000 });
    expect(errors).toEqual([]);
    await page.getByText(/^A\./).click();

    // Single group: the first correct answer grades + finishes the run —
    // the live card unmounts (status becomes done). Synchronize on the UI
    // before asserting the board, so the API check can't race the POST.
    await expect(page.getByText('Capital of France?')).toBeHidden({ timeout: 5000 });
    await expect
        .poll(async () => (await fetchBoard(page, s.code, token)).quiz.status, { timeout: 5000 })
        .toBe('done');
    const board = await fetchBoard(page, s.code, token);
    expect(board.quiz.leaderboard[0].points).toBe(10);
    expect(errors).toEqual([]);
});
