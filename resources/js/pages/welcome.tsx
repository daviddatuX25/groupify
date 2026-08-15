import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Logo } from '@/components/Logo';

export default function Welcome() {
    const [joinCode, setJoinCode] = useState('');

    const goJoin = () => {
        const code = joinCode.trim();
        if (/^\d{6}$/.test(code)) {
            router.visit(`/join/${code}`);
        }
    };

    return (
        <>
            <Head title="Groupify" />
            <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-6 text-slate-100">
                {/* soft Kinetic glow */}
                <div
                    className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #4edea3 0%, transparent 70%)' }}
                />
                <div className="relative flex w-full max-w-md flex-col items-center text-center">
                    <Logo className="h-16 w-16" />
                    <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-50">Groupify</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                        Ephemeral, session-based group formation. One code, a live board, groups that form in realtime.
                    </p>

                    <div className="mt-8 flex w-full flex-col gap-3">
                        <Link
                            href="/new"
                            className="rounded-xl bg-emerald-400 px-6 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
                        >
                            Start a session
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="h-px flex-1 bg-white/10" />
                            or join one
                            <span className="h-px flex-1 bg-white/10" />
                        </div>
                        <form
                            className="flex gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                goJoin();
                            }}
                        >
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="6-digit code"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-center font-mono text-lg tracking-[0.4em] text-slate-100 outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-500 focus:border-emerald-400/60"
                            />
                            <button
                                type="submit"
                                disabled={!joinCode}
                                className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Join
                            </button>
                        </form>
                        <p className="text-xs text-slate-300">Then enter the 4-digit PIN your host is showing.</p>
                    </div>

                    <div className="mt-10 grid w-full grid-cols-3 gap-2 text-center">
                        {[
                            ['1', 'Host creates', 'one code + PIN'],
                            ['2', 'Phones join', 'live board appears'],
                            ['3', 'Groups form', 'in realtime'],
                        ].map(([n, t, d]) => (
                            <div key={n} className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-4">
                                <p className="text-lg font-extrabold text-emerald-400">{n}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-200">{t}</p>
                                <p className="text-[11px] text-slate-500">{d}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="absolute bottom-5 text-[11px] text-slate-400">Self-hosted · ephemeral · no accounts</p>
            </div>
        </>
    );
}
