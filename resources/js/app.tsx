import { createInertiaApp } from '@inertiajs/react';
import { configureEcho } from '@laravel/echo-react';

// Tokens for the broadcast presence auth are read at module load — the echo
// auth headers are static per instance. The device token is persisted before
// navigation (join page); the admin token arrives in the initial Inertia page
// props before the component can persist it, so read it from there too.
const initialAdminToken = (() => {
    if (typeof window === 'undefined') return '';
    try {
        // Inertia 3 embeds the initial page JSON as a script tag's TEXT
        // (data-page="app"), not a data attribute on #app.
        const script = document.querySelector('script[data-page]');
        const page = script ? JSON.parse(script.textContent ?? '{}') : {};
        return (page.props?.session?.admin_token as string | undefined) ?? '';
    } catch {
        return '';
    }
})();
const deviceToken =
    typeof window === 'undefined' ? '' : (window.localStorage.getItem('groupify.device_token') ?? '');
const adminToken =
    typeof window === 'undefined'
        ? ''
        : (window.localStorage.getItem('groupify.admin_token') ?? initialAdminToken);

configureEcho({
    broadcaster: 'reverb',
    auth: {
        headers: {
            'X-Device-Token': deviceToken,
            'X-Admin-Token': adminToken,
        },
    },
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// PWA (CAP-12): register the offline shell service worker in production.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            /* offline support is progressive; never break the app over it */
        });
    });
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    progress: {
        color: '#4B5563',
    },
});
