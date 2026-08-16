import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    // Flaky WS timing under parallel load — one retry before a red CI.
    retries: 1,
    fullyParallel: true,
    // SQLite single-writer: 4 workers starve writes (30s busy-timeout hangs)
    // and stress the rig's Reverb delivery. 2 workers keep parallel speed
    // with stable timing.
    workers: 2,
    use: {
        // The suite runs inside the compose network; override with E2E_BASE_URL for host runs.
        baseURL: process.env.E2E_BASE_URL ?? 'http://app:8000',
        // The edge rig (compose.edge.yaml) terminates TLS with Caddy's internal CA.
        ignoreHTTPSErrors: true,
        trace: 'retain-on-failure',
    },
});
