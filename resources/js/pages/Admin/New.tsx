import { Link, useForm } from '@inertiajs/react';
import { Logo } from '@/components/Logo';

type JoinMode = 'open' | 'approval';
type EndMode = '1h' | '12h' | '1d' | '1w' | '1m' | 'manual' | 'custom';

type SetupData = {
    join_mode: JoinMode;
    qr_pinless: boolean;
    retention_days: number | null;
    end_mode: EndMode;
    custom_ends_at: string;
};

type ChoiceCardProps = {
    name: string;
    value: string;
    checked: boolean;
    onChange: () => void;
    title: string;
    description: string;
    meta?: string;
};

function ChoiceCard({ name, value, checked, onChange, title, description, meta }: ChoiceCardProps) {
    return (
        <label
            className={`relative flex cursor-pointer gap-3 rounded-2xl border p-4 text-left transition-all ${
                checked
                    ? 'border-primary/70 bg-primary/10 shadow-[0_0_22px_rgba(78,222,163,0.12)]'
                    : 'border-white/10 bg-surface-container-lowest hover:border-white/25'
            }`}
        >
            <input
                type="radio"
                name={name}
                value={value}
                checked={checked}
                onChange={onChange}
                className="mt-1 h-4 w-4 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            />
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-on-surface">{title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-on-surface-variant">{description}</span>
                {meta && <span className="mt-2 block font-mono text-[10px] font-semibold uppercase tracking-wider text-secondary">{meta}</span>}
            </span>
        </label>
    );
}

const durationChoices: { value: EndMode; title: string; description: string }[] = [
    { value: '1h', title: '1 hour', description: 'Good for a short activity or quick exercise.' },
    { value: '12h', title: '12 hours', description: 'Keep the room available through the day.' },
    { value: '1d', title: '1 day', description: 'Keep the room open until tomorrow.' },
    { value: '1w', title: '1 week', description: 'Use the room for a week-long activity.' },
    { value: '1m', title: '1 month', description: 'Keep the room available for a longer project.' },
    { value: 'manual', title: 'I will end it myself', description: 'The room stays open until you end it.' },
];

export default function New() {
    const { data, setData, post, processing, errors } = useForm<SetupData>({
        join_mode: 'open',
        qr_pinless: true,
        retention_days: 30,
        end_mode: '1d',
        custom_ends_at: '',
    });

    const selectedAccess = data.join_mode === 'open'
        ? 'People with the room link can enter right away.'
        : 'You can review group requests before people join a group.';
    const selectedDuration = data.end_mode === 'custom'
        ? data.custom_ends_at
            ? `The room closes on ${new Date(data.custom_ends_at).toLocaleString()}.`
            : 'Choose a date and time below.'
        : data.end_mode === 'manual'
            ? 'The room stays open until you end it.'
            : `The room closes after ${durationChoices.find((choice) => choice.value === data.end_mode)?.title ?? 'one day'}.`;

    return (
        <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-surface px-4 py-8 font-sans text-on-surface antialiased sm:px-6">
            <div className="glow-tr" />
            <div className="glow-bl" />

            <div className="glass-card relative z-10 w-full max-w-2xl rounded-2xl p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                <div className="mb-8 flex items-start gap-4">
                    <Logo className="h-12 w-12 shrink-0 text-primary drop-shadow-[0_0_18px_rgba(109,252,87,0.35)]" animated={true} />
                    <div>
                        <h1 className="font-display text-2xl font-extrabold tracking-tight text-on-surface">Start a room</h1>
                        <p className="mt-1 max-w-xl text-sm leading-relaxed text-on-surface-variant">
                            Choose how people enter and how long the room stays available. You can adjust the other room settings after launch.
                        </p>
                    </div>
                </div>

                <form
                    className="space-y-7"
                    onSubmit={(event) => {
                        event.preventDefault();
                        post('/sessions');
                    }}
                >
                    <fieldset>
                        <legend className="font-display text-lg font-bold text-on-surface">How should people enter?</legend>
                        <p className="mt-1 text-sm text-on-surface-variant">Choose the amount of control you want during arrival.</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <ChoiceCard
                                name="join_mode"
                                value="open"
                                checked={data.join_mode === 'open'}
                                onChange={() => setData('join_mode', 'open')}
                                title="Open room"
                                description="Anyone with the room link can enter without a PIN. Groups are available as soon as the room opens."
                                meta="Fastest for live activities"
                            />
                            <ChoiceCard
                                name="join_mode"
                                value="approval"
                                checked={data.join_mode === 'approval'}
                                onChange={() => setData('join_mode', 'approval')}
                                title="Review arrivals"
                                description="People enter through the PIN, then group requests wait for review before they are accepted."
                                meta="More control for the host"
                            />
                        </div>
                        {data.join_mode === 'approval' && (
                            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-surface-container-lowest px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={data.qr_pinless}
                                    onChange={(event) => setData('qr_pinless', event.target.checked)}
                                    className="mt-0.5 h-4 w-4 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-on-surface">Let QR visitors skip the PIN</span>
                                    <span className="mt-1 block text-xs leading-relaxed text-on-surface-variant">
                                        People who scan the projected QR code can enter without typing the PIN. Direct links still ask for it.
                                    </span>
                                </span>
                            </label>
                        )}
                        <p className="mt-2 text-xs text-secondary">{selectedAccess}</p>
                    </fieldset>

                    <fieldset>
                        <legend className="font-display text-lg font-bold text-on-surface">How long should the room stay open?</legend>
                        <p className="mt-1 text-sm text-on-surface-variant">Pick a duration that matches the activity. You can end the room early at any time.</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {durationChoices.map((choice) => (
                                <ChoiceCard
                                    key={choice.value}
                                    name="end_mode"
                                    value={choice.value}
                                    checked={data.end_mode === choice.value}
                                    onChange={() => setData('end_mode', choice.value)}
                                    title={choice.title}
                                    description={choice.description}
                                />
                            ))}
                            <ChoiceCard
                                name="end_mode"
                                value="custom"
                                checked={data.end_mode === 'custom'}
                                onChange={() => setData('end_mode', 'custom')}
                                title="Choose a date and time"
                                description="Set an exact closing time for this room."
                            />
                        </div>
                        {data.end_mode === 'custom' && (
                            <div className="mt-3 rounded-2xl border border-secondary/30 bg-secondary/5 p-4">
                                <label className="block text-sm font-semibold text-on-surface" htmlFor="custom-ends-at">
                                    Room closing time
                                </label>
                                <input
                                    id="custom-ends-at"
                                    type="datetime-local"
                                    value={data.custom_ends_at}
                                    onChange={(event) => setData('custom_ends_at', event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-white/10 bg-surface-container px-3 py-3 text-sm text-on-surface outline-none focus:border-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                                />
                                <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">Choose a future date and time in your local time zone.</p>
                                {errors.custom_ends_at && <p className="mt-2 text-xs text-error">{errors.custom_ends_at}</p>}
                            </div>
                        )}
                        <p className="mt-2 text-xs text-secondary">{selectedDuration}</p>
                    </fieldset>

                    <fieldset>
                        <legend className="font-display text-lg font-bold text-on-surface">How long should results remain available?</legend>
                        <p className="mt-1 text-sm text-on-surface-variant">Archived rooms are read-only until their results are deleted.</p>
                        <label className="mt-3 block max-w-sm" htmlFor="retention-days">
                            <span className="sr-only">Results retention</span>
                            <select
                                id="retention-days"
                                value={data.retention_days === null ? 'forever' : String(data.retention_days)}
                                onChange={(event) => setData('retention_days', event.target.value === 'forever' ? null : Number(event.target.value))}
                                className="w-full rounded-xl border border-white/10 bg-surface-container px-3 py-3 text-sm text-on-surface outline-none focus:border-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                            >
                                <option value="1">Delete results after 1 day</option>
                                <option value="2">Delete results after 2 days</option>
                                <option value="30">Delete results after 30 days</option>
                                <option value="180">Delete results after 6 months</option>
                                <option value="forever">Keep results until I delete them</option>
                            </select>
                        </label>
                    </fieldset>

                    <div className="rounded-2xl border border-secondary/20 bg-secondary/5 px-4 py-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">Your room plan</p>
                        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{selectedAccess} {selectedDuration}</p>
                    </div>

                    {(errors.join_mode || errors.qr_pinless || errors.retention_days || errors.end_mode || errors.custom_ends_at) && (
                        <div className="rounded-lg border border-error/30 bg-error-container/20 p-3 text-xs text-error" role="alert">
                            {errors.join_mode ?? errors.qr_pinless ?? errors.retention_days ?? errors.end_mode ?? errors.custom_ends_at}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={processing}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-4 font-display text-base font-bold text-on-primary-container shadow-[0_0_25px_rgba(78,222,61,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(78,222,61,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <span>{processing ? 'Creating room…' : 'Create room'}</span>
                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </button>
                </form>

                <div className="mt-6 border-t border-white/10 pt-4 text-center">
                    <Link href="/" className="inline-flex items-center gap-1 font-mono text-xs text-on-surface-variant transition-colors hover:text-secondary">
                        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        <span>Back to home</span>
                    </Link>
                </div>
            </div>
        </main>
    );
}
