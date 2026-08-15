import { useForm, Link } from '@inertiajs/react';
import { Logo } from '@/components/Logo';

type SetupData = {
    join_mode: 'open' | 'approval';
    qr_pinless: boolean;
    retention_days: number | null;
    ends_at: string;
};

function Toggle({
    on,
    onChange,
    label,
    hint,
}: {
    on: boolean;
    onChange: (value: boolean) => void;
    label: string;
    hint: string;
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-surface-container-lowest px-4 py-3 text-left transition-colors hover:border-white/20">
            <span>
                <span className="block text-sm font-semibold text-on-surface">{label}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-on-surface-variant">{hint}</span>
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => onChange(!on)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
                    on ? 'bg-primary-container' : 'bg-surface-variant'
                }`}
            >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
            </button>
        </label>
    );
}

export default function New() {
    const { data, setData, post, processing, errors } = useForm<SetupData>({
        join_mode: 'open',
        qr_pinless: true,
        retention_days: 30,
        ends_at: '',
    });

    const summary = [
        data.qr_pinless ? 'QR skips PIN' : 'QR requires PIN',
        data.join_mode === 'open' ? 'open group joins' : 'approval group joins',
        data.ends_at ? 'scheduled end' : 'manual end',
        data.retention_days === null ? 'manual deletion' : `keep ${data.retention_days} days`,
    ].join(' · ');

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface px-4 py-8 font-sans text-on-surface antialiased sm:px-6">
            <div className="glow-tr" />
            <div className="glow-bl" />

            <div className="glass-card relative z-10 w-full max-w-lg rounded-2xl p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                <div className="mb-7 flex items-center gap-4">
                    <Logo className="h-12 w-12 shrink-0 text-primary drop-shadow-[0_0_18px_rgba(109,252,87,0.35)]" animated={true} />
                    <div>
                        <h1 className="font-display text-2xl font-extrabold tracking-tight text-on-surface">Start a Session</h1>
                        <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">Set the two things people need to join. Fine-tune the rest after launch.</p>
                    </div>
                </div>

                <form
                    className="space-y-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        post('/sessions');
                    }}
                >
                    <section aria-labelledby="access-heading">
                        <h2 id="access-heading" className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            Access
                        </h2>
                        <div className="mt-2.5 space-y-2.5">
                            <Toggle
                                on={data.qr_pinless}
                                onChange={(value) => setData('qr_pinless', value)}
                                label="QR skips PIN"
                                hint="People scanning the projected QR can enter without typing the PIN."
                            />
                            <label className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-surface-container-lowest px-4 py-3 text-left">
                                <span className="text-sm font-semibold text-on-surface">Group join mode</span>
                                <select
                                    value={data.join_mode}
                                    onChange={(event) => setData('join_mode', event.target.value as SetupData['join_mode'])}
                                    className="rounded-lg border border-white/10 bg-surface-container px-3 py-2.5 text-xs text-on-surface outline-none focus:border-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                                >
                                    <option value="open">Open — people join groups immediately</option>
                                    <option value="approval">Approval — leaders review group requests</option>
                                </select>
                                <span className="text-[11px] leading-relaxed text-on-surface-variant">This controls group requests, not access to the session itself.</span>
                            </label>
                        </div>
                    </section>

                    <section aria-labelledby="lifecycle-heading">
                        <h2 id="lifecycle-heading" className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            Lifecycle
                        </h2>
                        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                            <label className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-surface-container-lowest px-4 py-3 text-left">
                                <span className="text-sm font-semibold text-on-surface">Session ends</span>
                                <input
                                    type="datetime-local"
                                    value={data.ends_at}
                                    onChange={(event) => setData('ends_at', event.target.value)}
                                    className="rounded-lg border border-white/10 bg-surface-container px-3 py-2.5 text-xs text-on-surface outline-none focus:border-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                                />
                                <span className="text-[11px] leading-relaxed text-on-surface-variant">Leave empty to end it manually.</span>
                            </label>
                            <label className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-surface-container-lowest px-4 py-3 text-left">
                                <span className="text-sm font-semibold text-on-surface">Keep results</span>
                                <select
                                    value={data.retention_days === null ? 'forever' : String(data.retention_days)}
                                    onChange={(event) => setData('retention_days', event.target.value === 'forever' ? null : Number(event.target.value))}
                                    className="rounded-lg border border-white/10 bg-surface-container px-3 py-2.5 text-xs text-on-surface outline-none focus:border-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                                >
                                    <option value="1">1 day after ending</option>
                                    <option value="2">2 days after ending</option>
                                    <option value="30">30 days after ending</option>
                                    <option value="180">6 months after ending</option>
                                    <option value="forever">Until I delete it</option>
                                </select>
                                <span className="text-[11px] leading-relaxed text-on-surface-variant">Results stay read-only until this retention period ends.</span>
                            </label>
                        </div>
                    </section>

                    <div className="rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3 text-center">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">Session plan</p>
                        <p className="mt-1 text-xs text-on-surface-variant">{summary}</p>
                    </div>

                    {(errors.join_mode || errors.qr_pinless || errors.retention_days || errors.ends_at) && (
                        <div className="rounded-lg border border-error/30 bg-error-container/20 p-3 text-xs text-error">
                            {errors.join_mode ?? errors.qr_pinless ?? errors.retention_days ?? errors.ends_at}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={processing}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-4 font-display text-base font-bold text-on-primary-container shadow-[0_0_25px_rgba(78,222,61,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(78,222,61,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <span>{processing ? 'Launching Room…' : 'Create Session'}</span>
                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </button>
                </form>

                <div className="mt-6 border-t border-white/10 pt-4 text-center">
                    <Link href="/" className="inline-flex items-center gap-1 font-mono text-xs text-on-surface-variant transition-colors hover:text-secondary">
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        <span>Back to Home</span>
                    </Link>
                </div>
            </div>
        </main>
    );
}
