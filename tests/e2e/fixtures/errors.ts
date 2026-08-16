import type { Page } from '@playwright/test';

/**
 * Capture page errors for the life of a test. Assert the returned array is
 * empty at the end of every flow spec — a page that rendered but threw is
 * still broken. Page errors only: console noise (fonts, third-party) must
 * not flake assertions.
 */
export function collectPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));

    return errors;
}

/**
 * Page errors + console errors as diagnostics — log on failure, don't
 * assert on the combined list.
 */
export function collectErrors(page: Page): string[] {
    const errors = collectPageErrors(page);
    page.on('console', (message) => {
        if (message.type() === 'error') {
            errors.push(`console: ${message.text()}`);
        }
    });

    return errors;
}
