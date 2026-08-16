import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import { apiHeaders } from './xsrf';
import type { Session } from './session';

export function newDeviceToken(): string {
    return randomUUID();
}

/** Join via the real join UI; PIN filled only when the form requires it. */
export async function join(
    page: Page,
    code: string,
    pin: string,
    name: string,
    opts: { deviceToken?: string; clearStorage?: boolean } = {},
): Promise<void> {
    if (opts.clearStorage ?? true) {
        await page.goto('/'); // same-origin context for localStorage
        await page.evaluate(() => localStorage.clear());
    }
    if (opts.deviceToken) {
        await page.addInitScript(
            (token) => localStorage.setItem('groupify.device_token', token),
            opts.deviceToken,
        );
    }
    await page.goto(`/join/${code}`);
    const pinInput = page.getByLabel('4-digit PIN');

    if (await pinInput.count()) {
        await pinInput.fill(pin);
    }
    await page.getByLabel('Your name').fill(name);
    await page.getByRole('button', { name: /enter the room/i }).click();
    await page.waitForURL(/\/s\/\d{6}/);
}

/** Join through the API (device-token identity) — returns the device token. */
export async function joinViaApi(
    page: Page,
    s: Session,
    name: string,
    deviceToken?: string,
): Promise<string> {
    const token = deviceToken ?? newDeviceToken();
    const res = await page.request.post(`/join/${s.code}`, {
        headers: apiHeaders(s.xsrf, { 'X-Device-Token': token }),
        data: { pin: s.pin, name, device_token: token },
    });
    expect(res.ok()).toBeTruthy();

    return token;
}

/** Open the participant view as an existing device (auto-rejoin identity). */
export async function openParticipantView(
    page: Page,
    code: string,
    token: string,
): Promise<void> {
    await page.addInitScript(
        (t) => localStorage.setItem('groupify.device_token', t),
        token,
    );
    await page.goto(`/s/${code}?device_token=${token}`);
}

/** Create a group via API as a joined participant. */
export async function createGroupViaApi(
    page: Page,
    s: Session,
    deviceToken: string,
): Promise<Response> {
    return page.request.post(`/s/${s.code}/groups`, {
        headers: apiHeaders(s.xsrf, { 'X-Device-Token': deviceToken }),
        data: {},
    });
}

/** Live board snapshot for the session. */
export async function fetchBoard(
    page: Page,
    code: string,
    deviceToken: string,
): Promise<any> {
    const res = await page.request.get(`/api/sessions/${code}/board`, {
        headers: { 'X-Device-Token': deviceToken },
    });

    return res.json();
}
