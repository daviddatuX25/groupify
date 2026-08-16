import type { Page } from '@playwright/test';

/** Read the XSRF token from the cookie jar (shared with page.request). */
export async function readXsrf(page: Page): Promise<string> {
    return page.evaluate(() => {
        const cookie = document.cookie
            .split('; ')
            .find((value) => value.startsWith('XSRF-TOKEN='));

        return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
    });
}

/** JSON API headers with CSRF; spread extra headers (device/admin token) last. */
export function apiHeaders(
    xsrf: string,
    extra: Record<string, string> = {},
): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-XSRF-TOKEN': xsrf,
        ...extra,
    };
}
