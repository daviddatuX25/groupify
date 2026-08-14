import { useForm } from '@inertiajs/react';
import { useMemo } from 'react';

export default function Join({ session }: { session: { code: string; status: string } }) {
    const deviceToken = useMemo(() => {
        if (typeof window === 'undefined') return '';
        let t = window.localStorage.getItem('groupify.device_token');
        if (!t) {
            t = crypto.randomUUID();
            window.localStorage.setItem('groupify.device_token', t);
        }
        return t;
    }, []);

    const { data, setData, post, processing, errors } = useForm({
        pin: '',
        name: '',
        email: '',
        device_token: deviceToken,
    });

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
