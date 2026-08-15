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
            <Head title="Groupify - Structured Clarity" />
            <div className="relative flex min-h-screen flex-col items-center justify-between overflow-x-hidden bg-surface text-on-surface font-sans selection:bg-primary/30">
                {/* Atmospheric Deep Ink Background with Multi-point Glows */}
                <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 bg-[#0b1326]" />
                    <div className="absolute top-0 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-primary/20 opacity-60 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-secondary/10 opacity-30 blur-3xl" />
                    <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-tertiary-container/10 opacity-30 blur-3xl" />
                </div>

                {/* Main Content */}
                <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-grow flex-col items-center justify-center px-4 py-12 md:px-8">
                    {/* Logo & Hero */}
                    <div className="mb-10 flex max-w-2xl flex-col items-center text-center">
                        <Logo className="mb-6 h-28 w-28 text-primary drop-shadow-[0_0_24px_rgba(109,252,87,0.35)]" animated={true} />
                        <h1 className="font-display text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl md:text-6xl">
                            Groupify
                        </h1>
                        <p className="mt-4 text-base font-medium leading-relaxed text-on-surface-variant sm:text-lg">
                            Turn chaotic room dynamics into structured clarity. One code, a live board, groups that form in realtime.
                         </p>
                     </div>

                    {/* Action Hub */}
                    <div className="mb-12 flex w-full max-w-md flex-col items-center gap-6">
                        {/* Primary Start Button */}
                        <Link
                            href="/new"
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-container py-4 px-8 text-center font-display text-base font-bold text-on-primary-container shadow-[0_0_30px_rgba(78,222,61,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(78,222,61,0.4)] active:scale-[0.98]"
                        >
                            <span>Start a Session</span>
                            <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        </Link>

                        {/* Divider */}
                        <div className="flex w-full items-center gap-4 opacity-60">
                            <div className="h-[1px] flex-grow bg-white/20" />
                            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                                or join one
                            </span>
                            <div className="h-[1px] flex-grow bg-white/20" />
                        </div>

                        <label htmlFor="join-code" className="self-start font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            Session code
                        </label>
                        <form
                            className="flex w-full items-center gap-2 rounded-2xl border border-white/15 bg-surface-container-low/90 p-2 shadow-xl backdrop-blur-xl transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_20px_rgba(78,222,61,0.15)]"
                            onSubmit={(e) => {
                                e.preventDefault();
                                goJoin();
                            }}
                        >
                            <div className="flex items-center pl-3 text-secondary">
                                <span className="material-symbols-outlined text-xl">dialpad</span>
                            </div>
                            <input
                                id="join-code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                aria-label="6-digit session code"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="flex-grow border-none bg-transparent text-center font-mono text-xl font-bold tracking-[0.3em] text-primary focus:ring-0 focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={joinCode.length < 6}
                                className="flex items-center gap-1.5 rounded-xl bg-surface-variant px-5 py-3 text-sm font-bold text-on-surface transition-all duration-200 hover:bg-surface-bright hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <span>Join</span>
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                        </form>
                        <p className="text-center font-mono text-xs text-on-surface-variant/70">
                            Enter the 4-digit PIN when prompted on your phone.
                        </p>
                    </div>

                    {/* 3-Step Strip */}
                    <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-white/10 bg-surface-container/50 p-6 text-center backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:bg-surface-container">
                            <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
                            <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-surface-variant text-primary shadow-[0_0_15px_rgba(109,252,87,0.2)]">
                                <span className="material-symbols-outlined text-[22px]">add_circle</span>
                            </div>
                            <h3 className="relative z-10 font-display text-lg font-bold text-on-surface">Host Creates</h3>
                            <p className="relative z-10 mt-1 text-xs leading-relaxed text-on-surface-variant">
                                Launch a live session instantly from the main display with a 6-digit code.
                            </p>
                        </div>

                        <div className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-white/10 bg-surface-container/50 p-6 text-center backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:bg-surface-container">
                            <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
                            <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-surface-variant text-primary shadow-[0_0_15px_rgba(109,252,87,0.2)]">
                                <span className="material-symbols-outlined text-[22px]">smartphone</span>
                            </div>
                            <h3 className="font-display text-lg font-bold text-on-surface relative z-10">Phones Join</h3>
                            <p className="relative z-10 mt-1 text-xs leading-relaxed text-on-surface-variant">
                                Participants scan the QR or enter the code. No accounts or downloads.
                            </p>
                        </div>

                        <div className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-white/10 bg-surface-container/50 p-6 text-center backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:bg-surface-container">
                            <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
                            <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-surface-variant text-primary shadow-[0_0_15px_rgba(109,252,87,0.2)]">
                                <span className="material-symbols-outlined text-[22px]">diversity_3</span>
                            </div>
                            <h3 className="font-display text-lg font-bold text-on-surface relative z-10">Groups Form</h3>
                            <p className="relative z-10 mt-1 text-xs leading-relaxed text-on-surface-variant">
                                Live boards cluster attendees in realtime with balance algorithms.
                            </p>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="relative z-10 w-full border-t border-white/5 bg-surface-container-lowest/80 py-6 text-center backdrop-blur-sm">
                    <p className="font-mono text-xs text-on-surface-variant/60">
                        Self-hosted · ephemeral · no accounts
                    </p>
                </footer>
            </div>
        </>
    );
}
