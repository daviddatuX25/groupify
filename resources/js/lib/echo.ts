import { configureEcho } from '@laravel/echo-react';

type EchoAuth = {
    deviceToken?: string;
    adminToken?: string;
};

/**
 * Configure Echo at the moment a surface has its real identity token.
 * Static module-load headers are too early for Inertia admin props, and a
 * baked localhost host breaks phones on LAN. Runtime origin is the safe
 * default; the dev stack may explicitly override host/port via Vite env.
 */
export function configureGroupifyEcho({ deviceToken = '', adminToken = '' }: EchoAuth = {}): void {
    const envHost: string = import.meta.env.VITE_REVERB_HOST ?? '';
    const envPort: number = import.meta.env.VITE_REVERB_PORT ? Number(import.meta.env.VITE_REVERB_PORT) : 0;
    const wsHost = typeof window !== 'undefined' && envHost === '' ? window.location.hostname : envHost;
    const wsPort =
        envPort ||
        (typeof window !== 'undefined'
            ? Number(window.location.port || (window.location.protocol === 'https:' ? 443 : 80))
            : 80);
    const forceTLS =
        typeof window !== 'undefined'
            ? window.location.protocol === 'https:'
            : (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https';

    configureEcho({
        broadcaster: 'reverb',
        wsHost,
        wsPort,
        wssPort: wsPort,
        forceTLS,
        auth: {
            headers: {
                'X-Device-Token': deviceToken,
                'X-Admin-Token': adminToken,
            },
        },
    });
}
