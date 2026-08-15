import { router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { Logo } from '@/components/Logo';
export default function Join({ session }: { session: { code: string; status: string; pin_required: boolean } }) {
    const [checking, setChecking] = useState(false);

    const deviceToken = useMemo(() => {
        if (typeof window === 'undefined') return '';
        let t = window.localStorage.getItem('groupify.device_token');
        if (!t) {
            // crypto.randomUUID requires a secure context (HTTPS); phones on a
            // plain-HTTP LAN (the self-hosted setup) only get the fallback.
            t =
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                          const r = (Math.random() * 16) | 0;
                          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
                      });
            window.localStorage.setItem('groupify.device_token', t);
        }
        return t;
    }, []);
    // QR grants are scoped to this session and only skip the PIN when the
    // facilitator enabled pinless QR access.
    const qrToken = useMemo(() => {
        if (typeof window === 'undefined') return '';
        return new URLSearchParams(window.location.search).get('qr_token') ?? '';
    }, []);

    // FR-2.4: a returning device with a seat skips the form and lands straight in.
    useEffect(() => {
        if (!deviceToken) return;
        setChecking(true);
        fetch(`/join/${session.code}/seat?token=${deviceToken}`)
            .then((r) => r.json())
            .then((res: { seat: boolean; name: string | null }) => {
                if (res.seat && res.name) {
                    window.localStorage.setItem('groupify.participant_name', res.name);
                    router.visit(`/s/${session.code}?device_token=${deviceToken}`);
                } else {
                    setChecking(false);
                }
            })
            .catch(() => setChecking(false));
    }, [deviceToken, session.code]);

    const { data, setData, post, processing, errors } = useForm({
        pin: '',
        name: '',
        email: '',
        device_token: deviceToken,
        qr_token: qrToken,
    });

    if (checking) {
        return (
            <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface px-6 text-on-surface">
                <div className="glow-tr" />
                <div className="glow-bl" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined animate-spin text-3xl text-primary">refresh</span>
                    <p className="font-mono text-sm tracking-wide text-on-surface-variant">Checking your seat…</p>
                </div>
            </main>
        );
    }

    const submit = () => {
        window.localStorage.setItem('groupify.participant_name', data.name);
        post(`/join/${session.code}`);
    };

    return (
        <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-surface px-4 py-6 font-sans text-on-surface antialiased sm:px-8">
            {/* Atmospheric Background Glows */}
            <div className="glow-tr" />
            <div className="glow-bl" />

            {/* Header */}
            <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between py-4">
                <div className="flex items-center gap-2">
                    <Logo className="h-7 w-7 text-primary drop-shadow-[0_0_12px_rgba(109,252,87,0.3)]" />
                    <h1 className="font-display text-xl font-extrabold tracking-tight text-on-surface">Groupify</h1>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface-container-high px-3 py-1 shadow-inner">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#ec4899] shadow-[0_0_6px_#ec4899]" />
                    <span className="font-mono text-xs font-bold tracking-wider text-on-surface">LIVE</span>
                </div>
            </header>

            {/* Main Form Card */}
            <main className="relative z-10 mx-auto my-auto flex w-full max-w-md flex-col justify-center py-6">
                <div className="glass-card flex flex-col gap-6 rounded-2xl p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                    {/* Title Section */}
                    <div className="flex flex-col items-center gap-1 text-center">
                        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">
                            Join session
                        </p>
                        <h2 className="font-mono text-4xl font-extrabold tracking-[0.35em] text-primary drop-shadow-[0_0_18px_rgba(109,252,87,0.35)] sm:text-5xl ml-[0.35em]">
                            {session.code}
                        </h2>
                        <p className="mt-1 text-xs text-on-surface-variant">
                            {session.pin_required ? 'Enter the 4-digit PIN your host is showing on screen.' : 'No PIN is needed for this session.'}
                        </p>
                        {!session.pin_required && (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                                <span className="material-symbols-outlined text-[14px]">lock_open</span>
                                PIN-free access
                            </span>
                        )}
                    </div>

                    {/* Form Fields */}
                    <form
                        className="flex flex-col gap-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            submit();
                        }}
                    >
                        {/* PIN Input */}
                        {session.pin_required && (
                            <div>
                                <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="pin">
                                    4-digit PIN
                                </label>
                                <input
                                    id="pin"
                                    type="text"
                                    inputMode="numeric"
                                    autoFocus
                                    maxLength={4}
                                    value={data.pin}
                                    onChange={(e) => setData('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    className="w-full rounded-xl border border-white/10 bg-[#060e20] py-3.5 text-center font-mono text-3xl font-extrabold tracking-[0.5em] text-[#ec4899] focus:border-primary focus:shadow-[0_0_15px_rgba(78,222,61,0.25)] focus:outline-none transition-all"
                                />
                                {errors.pin && <p className="mt-1.5 font-mono text-xs text-error">{errors.pin}</p>}
                            </div>
                        )}

                        {/* Name and Email */}
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="name">
                                    Your name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-[#060e20] px-4 py-3 text-sm text-on-surface focus:border-primary focus:shadow-[0_0_12px_rgba(78,222,61,0.2)] focus:outline-none transition-all"
                                />
                                {errors.name && <p className="mt-1.5 font-mono text-xs text-error">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="email">
                                    Email <span className="font-normal normal-case tracking-normal text-on-surface-variant/70">(optional)</span>
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-[#060e20] px-4 py-3 text-sm text-on-surface focus:border-primary focus:shadow-[0_0_12px_rgba(78,222,61,0.2)] focus:outline-none transition-all"
                                />
                                {errors.email && <p className="mt-1.5 font-mono text-xs text-error">{errors.email}</p>}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={processing || (session.pin_required && data.pin.length < 4) || !data.name.trim()}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3.5 font-display text-base font-bold text-on-primary-container shadow-[0_0_20px_rgba(78,222,61,0.25)] transition-all duration-200 hover:shadow-[0_0_30px_rgba(78,222,61,0.4)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <span>{processing ? 'Entering…' : 'Enter the room'}</span>
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </form>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 w-full py-4 text-center">
                <p className="font-mono text-xs text-on-surface-variant/50">
                    Self-hosted · ephemeral · no accounts
                </p>
            </footer>
        </div>
    );
}
