import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

type AdminSession = {
    code: string;
    pin: string;
    status: string;
    admin_token?: string;
};

export default function Show({ session }: { session: AdminSession }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [joinUrl, setJoinUrl] = useState('');
    const [ready, setReady] = useState(false);

    // Persist the admin token for later X-Admin-Token calls (AD-3) and render the
    // join QR (FR-2.2): scanning lands on /join/{code} with the code pre-filled;
    // the PIN is still typed by the participant.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (session.admin_token) {
            window.localStorage.setItem('groupify.admin_token', session.admin_token);
        }
        const url = `${window.location.origin}/join/${session.code}`;
        setJoinUrl(url);
        if (canvasRef.current) {
            void QRCode.toCanvas(canvasRef.current, url, {
                width: 160,
                margin: 1,
                color: { dark: '#0e1511', light: '#ffffff' },
            });
        }
        setReady(true);
    }, [session.admin_token, session.code]);

    if (!ready) return null;

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-extrabold tracking-tight">Groupify Admin</h1>
                <span className="font-mono text-rose-400">PIN: {session.pin}</span>
            </header>

            <section className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6 text-center">
                <canvas ref={canvasRef} className="h-40 w-40 rounded-lg bg-white p-2" />
                <div>
                    <p className="text-sm uppercase tracking-widest text-slate-400">Scan to join</p>
                    <p className="mt-1 font-mono text-xl font-bold tracking-widest text-cyan-400">
                        {session.code}
                    </p>
                    <p className="mt-2 max-w-xs text-xs text-slate-500">
                        {joinUrl || '…'} — participants still type the PIN after scanning.
                    </p>
                </div>
            </section>
        </main>
    );
}
