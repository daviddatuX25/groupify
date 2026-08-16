import { useConnectionStatus } from '@laravel/echo-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { SOUNDS, sound } from '@/lib/sound';

/**
 * Server-status UX (FR-8.1/8.2, AD-11): banner driven by the WebSocket
 * connection state with a /health heartbeat fallback. Never silently broken.
 * Sound: `caution` ONLY on the transition to degraded — never per heartbeat
 * retry (annoyance guard).
 */
export default function ServerStatus() {
    const status = useConnectionStatus();
    const [heartbeatOk, setHeartbeatOk] = useState(true);
    // Start "already degraded" so the initial connecting state on page load
    // never counts as a transition — only later drops make a sound.
    const wasDegraded = useRef(true);

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

    useEffect(() => {
        if (degraded && !wasDegraded.current) {
            sound.play(SOUNDS.CAUTION);
        }
        wasDegraded.current = degraded;
    }, [degraded]);

    if (!degraded) return null;

    const offline = heartbeatOk === false || status === 'disconnected';

    return (
        <motion.div
            role="status"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`px-4 py-2 text-center text-xs font-semibold ${
                offline ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-400/15 text-amber-300'
            }`}
        >
            {offline
                ? 'Server offline — you’re in a safe spot, reconnecting…'
                : 'Reconnecting to the session…'}
        </motion.div>
    );
}
