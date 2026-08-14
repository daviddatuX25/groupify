import { useConnectionStatus } from '@laravel/echo-react';
import { useEffect, useState } from 'react';

/**
 * Server-status UX (FR-8.1/8.2, AD-11): banner driven by the WebSocket
 * connection state with a /health heartbeat fallback. Never silently broken.
 */
export default function ServerStatus() {
    const status = useConnectionStatus();
    const [heartbeatOk, setHeartbeatOk] = useState(true);

    useEffect(() => {
        const tick = () => {
            fetch('/health')
                .then((r) => setHeartbeatOk(r.ok))
                .catch(() => setHeartbeatOk(false));
        };
        tick();
        const t = window.setInterval(tick, 10000);
        return () => window.clearInterval(t);
    }, []);

    const degraded = heartbeatOk === false || (status !== null && status !== 'connected');
    if (!degraded) return null;

    const offline = heartbeatOk === false || status === 'disconnected';

    return (
        <div
            role="status"
            className={`px-4 py-2 text-center text-xs font-semibold ${
                offline ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-400/15 text-amber-300'
            }`}
        >
            {offline
                ? 'Server offline — you’re in a safe spot, reconnecting…'
                : 'Reconnecting to the session…'}
        </div>
    );
}
