import { Head, Link } from '@inertiajs/react';
import { Logo } from '@/components/Logo';

export default function Welcome() {
    return (
        <>
            <Head title="Groupify" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100">
                <div className="flex flex-col items-center text-center">
                    <Logo className="h-20 w-20" />
                    <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-50">Groupify</h1>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                        Ephemeral, session-based group formation. One code, a live board, groups that form in realtime.
                    </p>
                    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
                        <Link
                            href="/new"
                            className="rounded-xl bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
                        >
                            Start a session
                        </Link>
                        <span className="text-xs text-slate-500">or join with a 6-digit code + PIN from your host</span>
                    </div>
                </div>
                <p className="absolute bottom-6 text-[11px] text-slate-600">Self-hosted · ephemeral · no accounts</p>
            </div>
        </>
    );
}
