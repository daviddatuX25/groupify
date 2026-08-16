import { expect, test } from '@playwright/test';
import { apiHeaders } from './fixtures/xsrf';
import { createSession, updateConfig } from './fixtures/session';
import { fetchBoard, joinViaApi, newDeviceToken } from './fixtures/participant';

/**
 * Session templates: save the current config, then apply it back over a
 * changed config. Templates are global (shared across sessions).
 */

test('a saved template applies its config back over changes', async ({
    page,
}) => {
    const s = await createSession(page);
    await updateConfig(page, s, {
        rules: { min_members: 2, max_members: 4 },
    });
    await page.reload();

    // Save the current config as a template.
    await page.getByRole('button', { name: /templates & activity/i }).click();
    await page.getByLabel('Template name').fill('Small Teams');
    await page
        .getByRole('button', { name: 'Save current config as template' })
        .click();
    await expect(page.getByText('Small Teams', { exact: true })).toBeVisible({
        timeout: 5000,
    });

    // Change the session config away from the template values.
    await updateConfig(page, s, {
        rules: { min_members: 5, max_members: 8 },
    });

    // Applying the template restores the saved rules.
    await page.getByRole('button', { name: 'apply', exact: true }).click();
    await expect
        .poll(
            async () => {
                const res = await page.request.get(
                    `/api/sessions/${s.code}/board`,
                    { headers: { 'X-Admin-Token': s.adminToken } },
                );
                const b = await res.json();

                return {
                    min: b.config?.rules?.min_members,
                    max: b.config?.rules?.max_members,
                };
            },
            { timeout: 5000 },
        )
        .toEqual({ min: 2, max: 4 });
});
