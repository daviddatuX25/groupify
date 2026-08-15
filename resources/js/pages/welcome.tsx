import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import {
    listSavedSessions,
    removeSavedSession,
    SAVED_SESSIONS_EVENT,
    type SavedSession,
} from '@/lib/savedSessions';

function formatLastVisited(timestamp: number): string {
    const elapsed = Math.max(0, Date.now() - timestamp);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (elapsed < minute) return 'Used just now';
    if (elapsed < hour) return `Used ${Math.floor(elapsed / minute)} minutes ago`;
    if (elapsed < day) return `Used ${Math.floor(elapsed / hour)} hours ago`;
    if (elapsed < 7 * day) return `Used ${Math.floor(elapsed / day)} days ago`;

    return `Used on ${new Date(timestamp).toLocaleDateString()}`;
}

function savedStatus(status: SavedSession['status']): string {
    if (status === 'archived') return 'This room has ended.';
    if (status === 'frozen') return 'The room is paused.';

    return 'Ready to open.';
}

export default function Welcome() {
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

    useEffect(() => {
        const refreshSavedSessions = () => setSavedSessions(listSavedSessions());
        refreshSavedSessions();
        window.addEventListener(SAVED_SESSIONS_EVENT, refreshSavedSessions);

        return () => window.removeEventListener(SAVED_SESSIONS_EVENT, refreshSavedSessions);
    }, []);

    const goJoin = () => {
        const code = joinCode.trim();
        if (!/^\d{6}$/.test(code)) {
            setJoinError('Enter the six-digit room code from your host.');
            return;
        }

        setJoinError('');
        router.visit(`/join/${code}`);
    };

    const openSaved = (session: SavedSession) => {
        router.visit(`/join/${session.code}`);
    };

    const forgetSaved = (code: string) => {
        removeSavedSession(code);
        setSavedSessions(listSavedSessions());
    };

    return (
        <>
            <Head title="Groupify | Make the room easy to join" />
            <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-surface text-on-surface font-sans selection:bg-primary/30">
                <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                    <div className="absolute inset-0 bg-[#0b1326]" />
                    <div className="absolute -top-32 left-1/2 h-[680px] w-[680px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-[460px] w-[460px] rounded-full bg-secondary/10 blur-3xl" />
                    <div className="absolute right-0 bottom-0 h-[460px] w-[460px] rounded-full bg-tertiary-container/10 blur-3xl" />
                </div>

                <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
                    <Link href="/" className="flex items-center gap-3" aria-label="Groupify home">
                        <Logo className="h-9 w-9 text-primary drop-shadow-[0_0_18px_rgba(109,252,87,0.35)]" animated={true} />
                        <span className="font-display text-xl font-extrabold tracking-tight text-on-surface">Groupify</span>
                    </Link>
                    <Link
                        href="/new"
                        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary transition-colors hover:border-primary/60 hover:bg-primary/20"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Create a room
                    </Link>
                </header>

                <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-14 sm:px-8">
                    <section className="grid min-w-0 items-stretch gap-5 pb-10 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6 lg:pt-14">
                        <div className="flex min-w-0 flex-col justify-center rounded-[2rem] border border-white/10 bg-surface-container/35 p-7 shadow-2xl backdrop-blur-md sm:p-10">
                            <div className="max-w-2xl">
                                <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-on-surface sm:text-5xl lg:text-6xl">
                                    Make the room easy to join.
                                </h1>
                                <p className="mt-5 max-w-xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
                                    Groupify gives everyone one clear place to arrive, find their group, and keep moving while the room changes in real time.
                                </p>
                                <div className="mt-8 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                                    <Link
                                        href="/new"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-container px-5 py-3.5 font-display text-sm font-bold text-on-primary-container shadow-[0_0_28px_rgba(78,222,163,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_38px_rgba(78,222,163,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:scale-[0.98]"
                                    >
                                        Start a new room
                                        <span className="material-symbols-outlined text-[19px]">arrow_forward</span>
                                    </Link>
                                    <span className="font-mono text-xs text-on-surface-variant">No account or download needed.</span>
                                </div>
                            </div>
                        </div>

                        <section className="flex min-w-0 flex-col justify-between rounded-[2rem] border border-secondary/25 bg-surface-container-low/85 p-6 shadow-2xl backdrop-blur-xl sm:p-8" aria-labelledby="join-room-heading">
                            <div>
                                <div className="flex items-center justify-between gap-4">
                                    <h2 id="join-room-heading" className="font-display text-2xl font-bold text-on-surface">Join a room</h2>
                                    <span className="material-symbols-outlined text-3xl text-secondary">login</span>
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                                    Enter the six-digit code your host shared. The room will tell you whether a PIN is needed.
                                </p>
                            </div>
                            <form
                                className="mt-8"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    goJoin();
                                }}
                            >
                                <label htmlFor="join-code" className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                                    Room code
                                </label>
                                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/15 bg-surface-container-lowest/90 p-2 shadow-xl transition-all focus-within:border-secondary/70 focus-within:shadow-[0_0_22px_rgba(76,215,246,0.15)]">
                                    <span className="material-symbols-outlined pl-2 text-xl text-secondary" aria-hidden="true">dialpad</span>
                                    <input
                                        id="join-code"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        aria-describedby={joinError ? 'join-code-error' : 'join-code-help'}
                                        value={joinCode}
                                        onChange={(event) => {
                                            setJoinCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                                            setJoinError('');
                                        }}
                                        className="min-w-0 flex-1 border-none bg-transparent py-2 text-center font-mono text-2xl font-bold tracking-[0.28em] text-primary outline-none focus:ring-0"
                                    />
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-surface-variant px-4 py-3 text-sm font-bold text-on-surface transition-all hover:bg-surface-bright hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:scale-95"
                                    >
                                        Open
                                        <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                                    </button>
                                </div>
                                <p id="join-code-help" className="mt-2 text-xs text-on-surface-variant">Use the code shown on the host screen.</p>
                                {joinError && <p id="join-code-error" className="mt-2 text-xs text-error" role="alert">{joinError}</p>}
                            </form>
                        </section>
                    </section>

                    <section aria-labelledby="saved-rooms-heading" className="border-t border-white/10 pt-8">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h2 id="saved-rooms-heading" className="font-display text-2xl font-bold text-on-surface">Your saved rooms</h2>
                                <p className="mt-1 text-sm text-on-surface-variant">Saved on this browser so you can return without typing the code again.</p>
                            </div>
                            {savedSessions.length > 0 && <span className="font-mono text-xs uppercase tracking-wider text-primary">{savedSessions.length} saved</span>}
                        </div>

                        {savedSessions.length > 0 ? (
                            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {savedSessions.map((session) => (
                                    <article key={session.code} className="group flex flex-col rounded-2xl border border-white/10 bg-surface-container/70 p-5 shadow-xl transition-all hover:border-primary/40 hover:bg-surface-container">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-display text-lg font-bold text-on-surface">{session.label}</p>
                                                <p className="mt-1 font-mono text-xl font-bold tracking-[0.18em] text-primary">{session.code}</p>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${session.status === 'archived' ? 'bg-error-container/30 text-error' : 'bg-primary/10 text-primary'}`}>
                                                {session.status === 'archived' ? 'Ended' : 'Saved'}
                                            </span>
                                        </div>
                                        <p className="mt-4 text-xs text-on-surface-variant">{formatLastVisited(session.lastVisitedAt)}. {savedStatus(session.status)}</p>
                                        <div className="mt-5 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openSaved(session)}
                                                className="flex-1 rounded-xl bg-primary-container px-3 py-2.5 font-display text-xs font-bold text-on-primary-container transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:scale-95"
                                            >
                                                Open room
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => forgetSaved(session.code)}
                                                aria-label={`Remove ${session.label}`}
                                                title={`Remove ${session.label}`}
                                                className="rounded-xl border border-white/10 px-3 py-2.5 text-on-surface-variant transition-colors hover:border-error/40 hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                                            >
                                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">bookmark_remove</span>
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-white/15 bg-surface-container-low/50 px-6 py-10 text-center">
                                <span className="material-symbols-outlined text-3xl text-on-surface-variant">bookmark_add</span>
                                <p className="mt-3 font-display text-base font-bold text-on-surface">No saved rooms yet</p>
                                <p className="mt-1 max-w-md text-sm leading-relaxed text-on-surface-variant">Open a room and choose Save room when you want this browser to remember it.</p>
                            </div>
                        )}
                    </section>

                    <section className="mt-12 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-3" aria-label="How Groupify works">
                        <div className="rounded-2xl border border-white/10 bg-surface-container/45 p-5">
                            <span className="material-symbols-outlined text-2xl text-primary" aria-hidden="true">add_circle</span>
                            <h3 className="mt-4 font-display text-lg font-bold text-on-surface">Create a room</h3>
                            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">Set the access rules and duration, then share the room code.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-surface-container/45 p-5">
                            <span className="material-symbols-outlined text-2xl text-secondary" aria-hidden="true">smartphone</span>
                            <h3 className="mt-4 font-display text-lg font-bold text-on-surface">People join</h3>
                            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">Participants use the code or scan the QR code on the host screen.</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-surface-container/45 p-5">
                            <span className="material-symbols-outlined text-2xl text-tertiary" aria-hidden="true">diversity_3</span>
                            <h3 className="mt-4 font-display text-lg font-bold text-on-surface">Groups take shape</h3>
                            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">Everyone sees the live board as people find their place.</p>
                        </div>
                    </section>
                </main>

                <footer className="relative z-10 border-t border-white/5 bg-surface-container-lowest/80 py-6 text-center backdrop-blur-sm">
                    <p className="font-mono text-xs text-on-surface-variant/60">Rooms are temporary. No accounts are required.</p>
                </footer>
            </div>
        </>
    );
}
