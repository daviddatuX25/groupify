import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('participant page renders a live quiz without crashing', async ({ page }) => {
    const request = page.request;
    // Self-contained: create a session through the API (shared cookie jar).
    await page.goto('/new');
    const xsrf = await page.evaluate(() => {
        const c = document.cookie.split('; ').find((x) => x.startsWith('XSRF-TOKEN='));
        return c ? decodeURIComponent(c.split('=')[1]) : '';
    });
    const created = await request.post('/sessions', { headers: { 'X-XSRF-TOKEN': xsrf } });
    expect(created.ok()).toBeTruthy();
    const finalUrl = created.url();
    const sid = finalUrl.match(/sessions\/(\d+)/)?.[1];
    const atok = finalUrl.match(/token=(\w+)/)?.[1];
    expect(sid && atok).toBeTruthy();

    // Admin page: code + PIN + quiz questions.
    await page.goto(`/admin/sessions/${sid}?token=${atok}`);
    const code = (await page.getByText(/\b\d{6}\b/).first().textContent())?.trim() ?? '';
    expect(code).toMatch(/^\d{6}$/);
    const pin = (await page.getByText(/PIN:/).textContent())?.match(/\d{4}/)?.[0] ?? '';
    expect(pin).toMatch(/^\d{4}$/);

    const admin = { 'X-Admin-Token': atok, 'X-XSRF-TOKEN': xsrf, 'Content-Type': 'application/json', Accept: 'application/json' };
    await request.put(`/admin/sessions/${sid}/quiz`, {
        headers: admin,
        data: { questions: [{ q: 'Capital of France?', options: ['Paris', 'Lyon'], answer: 0, points: 10 }] },
    });

    // Participant joins, forms a group, quiz goes live.
    const token = randomUUID();
    const participant = { 'X-Device-Token': token, 'X-XSRF-TOKEN': xsrf, 'Content-Type': 'application/json', Accept: 'application/json' };
    await request.post(`/join/${code}`, { headers: participant, data: { pin, name: 'Maya', device_token: token } });
    const groupRes = await request.post(`/s/${code}/groups`, { headers: participant, data: {} });
    expect(groupRes.ok()).toBeTruthy();
    await request.post(`/admin/sessions/${sid}/quiz/start`, { headers: admin });

    // The participant page must render the live quiz without crashing.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.addInitScript((t) => localStorage.setItem('groupify.device_token', t), token);
    await page.goto(`/s/${code}?device_token=${token}`);
    await expect(page.getByText('Capital of France?')).toBeVisible({ timeout: 10000 });
    expect(errors).toEqual([]);
    await page.getByText(/^A\./).click();

    // Single group: the first correct answer grades + finishes the run.
    const board = await request.get(`/api/sessions/${code}/board`, { headers: { 'X-Device-Token': token } });
    const quiz = (await board.json()).quiz;
    expect(quiz.status).toBe('done');
    expect(quiz.leaderboard[0].points).toBe(10);
    expect(errors).toEqual([]);
});
