import { useForm, Link } from '@inertiajs/react';
import { Logo } from '@/components/Logo';

export default function New() {
    const { post, processing, errors } = useForm({});

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface px-6 font-sans text-on-surface antialiased">
            {/* Atmospheric Background Glows */}
            <div className="glow-tr" />
            <div className="glow-bl" />

            <div className="glass-card relative z-10 w-full max-w-md rounded-2xl p-8 text-center shadow-2xl backdrop-blur-xl">
                <div className="mb-6 flex justify-center">
                    <Logo className="h-16 w-16 text-primary drop-shadow-[0_0_20px_rgba(109,252,87,0.35)]" animated={true} />
                </div>

                <h1 className="font-display text-3xl font-extrabold tracking-tight text-on-surface">
                    Start a Session
                </h1>
                <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                    Launch a realtime room. Participants join instantly with a 6-digit code and PIN on their phones.
                </p>

                <button
                    type="button"
                    onClick={() => post('/sessions')}
                    disabled={processing}
                    className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-4 font-display text-base font-bold text-on-primary-container shadow-[0_0_25px_rgba(78,222,61,0.3)] transition-all duration-200 hover:shadow-[0_0_35px_rgba(78,222,61,0.45)] hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <span>{processing ? 'Launching Room…' : 'Create Session'}</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>

                {errors.message && (
                    <div className="mt-4 rounded-lg bg-error-container/20 border border-error/30 p-2.5 text-xs text-error">
                        {errors.message}
                    </div>
                )}

                <div className="mt-6 border-t border-white/10 pt-4">
                    <Link href="/" className="inline-flex items-center gap-1 font-mono text-xs text-on-surface-variant hover:text-secondary transition-colors">
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        <span>Back to Home</span>
                    </Link>
                </div>
            </div>
        </main>
    );
}
