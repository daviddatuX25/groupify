import { useEffect, useState } from 'react';

type AdminSession = {
    code: string;
    pin: string;
    status: string;
    admin_token?: string;
};

export default function Show({ session }: { session: AdminSession }) {
    const [ready, setReady] = useState(false);

    // Persist the admin token for later X-Admin-Token calls (AD-3).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (session.admin_token) {
            window.localStorage.setItem('groupify.admin_token', session.admin_token);
        }
        setReady(true);
    }, [session.admin_token]);

    if (!ready) return null;

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-extrabold tracking-tight">Groupify Admin</h1>
                <span className="font-mono text-rose-400">PIN: {session.pin}</span>
            </header>
            <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-6">
                <p className="text-sm uppercase tracking-widest text-slate-400">Session code</p>
                <p className="mt-1 text-5xl font-black tracking-widest text-cyan-400">{session.code}</p>
                <p className="mt-4 text-sm text-slate-400">
                    QR + live stats land here in the admin board story (3-1).
                </p>
            </section>
        </main>
    );
}
