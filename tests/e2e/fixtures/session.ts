import { expect, type Page } from '@playwright/test';
import { apiHeaders, readXsrf } from './xsrf';

export interface Session {
    sessionId: string;
    adminToken: string;
    code: string;
    pin: string;
    xsrf: string;
    adminUrl: string;
}

/**
 * Read the Inertia page payload the app mounted on. The admin page exposes
 * code + PIN as props — no body-text regex scraping. (Inertia 3 embeds the
 * payload in a data-page JSON script, not on the #app element.)
 */
export async function pageProps(page: Page): Promise<Record<string, any>> {
    return page.evaluate(() => {
        const script = document.querySelector('script[data-page]');

        return script
            ? (JSON.parse(script.textContent ?? '{}') as Record<string, any>)
            : {};
    });
}

/**
 * Create a session via API and land on the admin panel. The admin page mount
 * persists the host record (savedSessions) exactly like the real flow.
 */
export async function createSession(page: Page): Promise<Session> {
    await page.goto('/new');
    const xsrf = await readXsrf(page);
    const created = await page.request.post('/sessions', {
        headers: { 'X-XSRF-TOKEN': xsrf },
    });
    const url = created.url();
    const sessionId = url.match(/sessions\/(\d+)/)?.[1] ?? '';
    const adminToken = url.match(/token=(\w+)/)?.[1] ?? '';
    expect(sessionId && adminToken).toBeTruthy();

    await page.goto(`/admin/sessions/${sessionId}?token=${adminToken}`);

    const props = await pageProps(page);
    const code: string = props?.props?.session?.code ?? '';
    const pin: string = props?.props?.session?.pin ?? '';
    expect(code).toMatch(/^\d{6}$/);
    expect(pin).toMatch(/^\d{4}$/);

    return { sessionId, adminToken, code, pin, xsrf, adminUrl: page.url() };
}

/** PUT session config (rules/perms/plugins) as the admin. */
export async function updateConfig(
    page: Page,
    s: Session,
    data: Record<string, unknown>,
): Promise<Response> {
    return page.request.put(`/admin/sessions/${s.sessionId}/config`, {
        headers: apiHeaders(s.xsrf, { 'X-Admin-Token': s.adminToken }),
        data,
    });
}
