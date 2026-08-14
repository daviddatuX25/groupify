import { useEffect, useState } from 'react';

type SessionProps = {
    session: { code: string; status: string };
};

export default function Show({ session }: SessionProps) {
    const [identity, setIdentity] = useState<{ name: string } | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const name = window.localStorage.getItem('groupify.participant_name');
        setIdentity(name ? { name } : null);
    }, []);

    return (
        <main className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
            {/* FR-1.6: join-instruction bar pinned on every participant screen (AhaSlides pattern) */}
            <div className="border-b border-white/10 bg-slate-900/80 px-6 py-2 text-center text-xs text-slate-400 backdrop-blur">
                Joining late? Open <span className="font-mono text-cyan-400">{typeof window !== 'undefined' ? `${window.location.origin}/join/${session.code}` : `/join/${session.code}`}</span>{' '}
                and enter the PIN from your host.
            </div>
            <div className="flex flex-1 flex-col px-6 py-8">
                <header className="flex items-center justify-between">
                    <h1 className="text-xl font-extrabold tracking-tight">Groupify</h1>
                    <span className="font-mono text-cyan-400">{session.code}</span>
                </header>

                <section className="mt-16 text-center">
                    <p className="text-5xl">You&rsquo;re in!</p>
                    {identity && <p className="mt-2 text-slate-400">Seat: {identity.name}</p>}
                    <p className="mt-8 text-sm text-slate-500">
                        The live pool and group board arrive in Epic 2 — stay tuned on this page.
                    </p>
                </section>
            </div>
        </main>
    );
}
