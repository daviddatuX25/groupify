import { router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

export default function Join({ session }: { session: { code: string; status: string } }) {
    const [checking, setChecking] = useState(false);

    const deviceToken = useMemo(() => {
        if (typeof window === 'undefined') return '';
        let t = window.localStorage.getItem('groupify.device_token');
        if (!t) {
            t = crypto.randomUUID();
            window.localStorage.setItem('groupify.device_token', t);
        }
        return t;
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
    });

    if (checking) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
                <p className="text-slate-400">Checking your seat…</p>
            </main>
        );
    }

    const submit = () => {
        window.localStorage.setItem('groupify.participant_name', data.name);
        post(`/join/${session.code}`);
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
            <div className="w-full max-w-md">
                <h1 className="text-4xl font-extrabold tracking-tight">Groupify</h1>
                <p className="mt-2 text-slate-400">
                    Join session <span className="font-mono font-bold text-cyan-400">{session.code}</span> — enter
                    the PIN your host is showing.
                </p>

                <div className="mt-8 space-y-4">
                    <div>
                        <input
                            type="text"
                            inputMode="numeric"
                            autoFocus
                            placeholder="PIN"
                            value={data.pin}
                            onChange={(e) => setData('pin', e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 font-mono text-2xl tracking-widest outline-none focus:border-cyan-400"
                        />
                        {errors.pin && <p className="mt-1 text-sm text-rose-400">{errors.pin}</p>}
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Your name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400"
                        />
                        {errors.name && <p className="mt-1 text-sm text-rose-400">{errors.name}</p>}
                    </div>
                    <div>
                        <input
                            type="email"
                            placeholder="Email (optional)"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400"
                        />
                        {errors.email && <p className="mt-1 text-sm text-rose-400">{errors.email}</p>}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={submit}
                    disabled={processing}
                    className="mt-6 w-full rounded-2xl bg-emerald-400 py-3 font-bold text-emerald-950 transition active:scale-[0.98] disabled:opacity-60"
                >
                    {processing ? 'Joining…' : 'Enter the room'}
                </button>
            </div>
        </main>
    );
}
