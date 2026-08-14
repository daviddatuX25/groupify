import { useForm } from '@inertiajs/react';

export default function New() {
    const { post, processing, errors } = useForm({});

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
            <div className="w-full max-w-md">
                <h1 className="text-4xl font-extrabold tracking-tight">Groupify</h1>
                <p className="mt-2 text-slate-400">
                    Start a session — participants join by code on their phones.
                </p>
                <button
                    type="button"
                    onClick={() => post('/sessions')}
                    disabled={processing}
                    className="mt-8 w-full rounded-2xl bg-emerald-400 py-3 font-bold text-emerald-950 transition active:scale-[0.98] disabled:opacity-60"
                >
                    {processing ? 'Creating…' : 'Create session'}
                </button>
                {errors.message && <p className="mt-2 text-rose-400">{errors.message}</p>}
            </div>
        </main>
    );
}
