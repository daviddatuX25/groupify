import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { configureGroupifyEcho } from '@/lib/echo';

const initialAdminToken = (() => {
    if (typeof window === 'undefined') return '';
    try {
        const script = document.querySelector('script[data-page]');
        const page = script ? JSON.parse(script.textContent ?? '{}') : {};
        return (page.props?.session?.admin_token as string | undefined) ?? '';
    } catch {
        return '';
    }
})();

configureGroupifyEcho({
    deviceToken: typeof window === 'undefined' ? '' : (window.localStorage.getItem('groupify.device_token') ?? ''),
    adminToken:
        typeof window === 'undefined'
            ? ''
            : (window.localStorage.getItem('groupify.admin_token') ?? initialAdminToken),
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
    resolve: async (name) => {
        const pages = import.meta.glob<{ default: ResolvedComponent }>('./pages/**/*.tsx');
        const page = pages[`./pages/${name}.tsx`];

        if (!page) {
            throw new Error(`Unknown Inertia page: ${name}`);
        }

        return page().then((module) => module.default);
    },
    setup({ el, App, props }) {
        if (el) {
            createRoot(el).render(<App {...props} />);

            return;
        }

        return <App {...props} />;
    },
    progress: {
        color: '#4B5563',
    },
});
