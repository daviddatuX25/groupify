import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    retries: 0,
    use: {
        // The suite runs inside the compose network; override with E2E_BASE_URL for host runs.
        baseURL: process.env.E2E_BASE_URL ?? 'http://app:8000',
        // The edge rig (compose.edge.yaml) terminates TLS with Caddy's internal CA.
        ignoreHTTPSErrors: true,
        trace: 'retain-on-failure',
    },
});
