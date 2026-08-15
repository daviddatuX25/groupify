import { Link, useForm } from '@inertiajs/react';
import { useState  } from 'react';
import type {FormEvent} from 'react';
import { Logo } from '@/components/Logo';
import { saveSession } from '@/lib/savedSessions';

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
    checked: boolean;
    onChange: () => void;
    title: string;
    description?: string;
    meta?: string;
    compact?: boolean;
    className?: string;
};

function ChoiceCard({
    checked,
    onChange,
    title,
    description,
    meta,
    compact = false,
    className = '',
}: ChoiceCardProps) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={onChange}
            className={`relative flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-2xl border text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
                compact ? 'min-h-16 p-3.5' : 'p-4'
            } ${
                checked
                    ? 'border-primary/70 bg-primary/10 shadow-[0_0_22px_rgba(78,222,163,0.12)]'
                    : 'border-white/10 bg-surface-container-lowest hover:border-white/25'
            } ${className}`}
        >
            <span className="min-w-0 flex-1">
                <span
                    className={`block font-semibold text-on-surface ${compact ? 'text-xs' : 'text-sm'}`}
                >
                    {title}
                </span>
                {description && (
                    <span className="mt-1 block text-xs leading-relaxed text-on-surface-variant">
                        {description}
                    </span>
                )}
                {meta && (
                    <span className="mt-2 block font-mono text-[10px] font-semibold tracking-wider text-secondary uppercase">
                        {meta}
                    </span>
                )}
            </span>
            {checked && (
                <span
                    className="material-symbols-outlined text-[17px] text-primary"
                    aria-hidden="true"
                >
                    check
                </span>
            )}
            <span className="sr-only">
                {checked ? 'Selected' : 'Not selected'}
            </span>
        </button>
    );
}

const durationChoices: { value: EndMode; title: string }[] = [
    { value: '1h', title: '1 hour' },
    { value: '12h', title: '12 hours' },
    { value: '1d', title: '1 day' },
    { value: '1w', title: '1 week' },
    { value: '1m', title: '1 month' },
    { value: 'manual', title: 'I will end it' },
];

const setupSteps = [
    { label: 'Access', title: 'Choose how people enter' },
    { label: 'Duration', title: 'Set the room lifetime' },
    { label: 'Finish', title: 'Keep the results' },
];

export default function New() {
    const [step, setStep] = useState(0);
    const { data, setData, post, processing, errors } = useForm<SetupData>({
        join_mode: 'open',
        qr_pinless: true,
        retention_days: 30,
        end_mode: '1d',
        custom_ends_at: '',
    });

    const selectedAccess =
        data.join_mode === 'open'
            ? 'Open access'
            : 'Review arrivals before they join a group';
    const selectedDuration =
        data.end_mode === 'custom'
            ? data.custom_ends_at
                ? `Closes ${new Date(data.custom_ends_at).toLocaleString()}.`
                : 'Choose a closing date and time.'
            : data.end_mode === 'manual'
              ? 'Ends when you close it.'
              : `Closes after ${durationChoices.find((choice) => choice.value === data.end_mode)?.title ?? 'one day'}.`;
    const errorMessage =
        errors.join_mode ??
        errors.qr_pinless ??
        errors.retention_days ??
        errors.end_mode ??
        errors.custom_ends_at;
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (step < setupSteps.length - 1) {
            setStep((current) => Math.min(setupSteps.length - 1, current + 1));

            return;
        }

        post('/sessions', {
            onSuccess: (page) => {
                const created = page.props.session as
                    | {
                          code?: string;
                          expires_at?: string | null;
                      }
                    | undefined;

                if (created?.code) {
                    saveSession(created.code, 'live', created.expires_at);
                }
            },
        });
    };

    return (
        <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-surface px-4 py-6 font-sans text-on-surface antialiased sm:px-6 sm:py-10">
            <div className="glow-tr" />
            <div className="glow-bl" />

            <div className="glass-card relative z-10 w-full max-w-xl rounded-2xl p-5 shadow-2xl backdrop-blur-xl sm:p-6">
                <div className="flex items-start gap-3">
                    <Logo
                        className="h-10 w-10 shrink-0 text-primary drop-shadow-[0_0_18px_rgba(109,252,87,0.35)]"
                        animated={true}
                    />
                    <div className="min-w-0">
                        <h1 className="font-display text-xl font-extrabold tracking-tight text-on-surface">
                            Start a room
                        </h1>
                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                            Set the essentials now. Fine-tune the room after
                            launch.
                        </p>
                    </div>
                </div>

                <nav
                    className="mt-6 flex items-center gap-2"
                    aria-label="Session setup progress"
                >
                    {setupSteps.map((setupStep, index) => (
                        <div
                            key={setupStep.label}
                            className="flex min-w-0 flex-1 items-center gap-2"
                        >
                            <button
                                type="button"
                                onClick={() => setStep(index)}
                                aria-current={
                                    step === index ? 'step' : undefined
                                }
                                aria-label={`Go to ${setupStep.label} step`}
                                title={setupStep.title}
                                className="group flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                            >
                                <span
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full border transition-all ${
                                        step === index
                                            ? 'border-primary bg-primary shadow-[0_0_12px_rgba(78,222,163,0.65)]'
                                            : step > index
                                              ? 'border-primary/70 bg-primary/30'
                                              : 'border-on-surface-variant/50'
                                    }`}
                                    aria-hidden="true"
                                />
                                <span
                                    className={`hidden truncate font-mono text-[10px] font-bold tracking-wider uppercase sm:block ${step === index ? 'text-primary' : 'text-on-surface-variant'}`}
                                >
                                    {setupStep.label}
                                </span>
                            </button>
                            {index < setupSteps.length - 1 && (
                                <span
                                    className={`h-px min-w-3 flex-1 ${step > index ? 'bg-primary/50' : 'bg-white/10'}`}
                                    aria-hidden="true"
                                />
                            )}
                        </div>
                    ))}
                </nav>

                <form className="mt-6" onSubmit={handleSubmit}>
                    {step === 0 && (
                        <section aria-labelledby="setup-access-title">
                            <p className="font-mono text-[10px] font-bold tracking-widest text-secondary uppercase">
                                Step 1 of 3
                            </p>
                            <h2
                                id="setup-access-title"
                                className="mt-2 font-display text-lg font-bold text-on-surface"
                            >
                                How should people enter?
                            </h2>
                            <p className="mt-1 text-xs text-on-surface-variant">
                                Choose the amount of control you want during
                                arrival.
                            </p>
                            <div
                                className="mt-4 grid gap-3 sm:grid-cols-2"
                                role="radiogroup"
                                aria-label="Room access mode"
                            >
                                <ChoiceCard
                                    checked={data.join_mode === 'open'}
                                    onChange={() =>
                                        setData('join_mode', 'open')
                                    }
                                    title="Open room"
                                    description="People with the room link can enter right away."
                                    meta="Fastest"
                                />
                                <ChoiceCard
                                    checked={data.join_mode === 'approval'}
                                    onChange={() =>
                                        setData('join_mode', 'approval')
                                    }
                                    title="Review arrivals"
                                    description="Requests wait for your approval before joining a group."
                                    meta="More control"
                                />
                            </div>
                            {data.join_mode === 'approval' && (
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={data.qr_pinless}
                                    onClick={() =>
                                        setData('qr_pinless', !data.qr_pinless)
                                    }
                                    className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-left transition-colors hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                                >
                                    <span className="min-w-0">
                                        <span className="block text-xs font-semibold text-on-surface">
                                            Let QR visitors skip the PIN
                                        </span>
                                        <span className="mt-1 block text-[11px] leading-relaxed text-on-surface-variant">
                                            Scanned links can enter without
                                            typing the session PIN.
                                        </span>
                                    </span>
                                    <span
                                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${data.qr_pinless ? 'bg-primary' : 'bg-surface-variant'}`}
                                    >
                                        <span
                                            className={`absolute top-1 h-3 w-3 rounded-full bg-on-primary-container transition-transform ${data.qr_pinless ? 'left-5' : 'left-1'}`}
                                        />
                                    </span>
                                </button>
                            )}
                        </section>
                    )}

                    {step === 1 && (
                        <section aria-labelledby="setup-duration-title">
                            <p className="font-mono text-[10px] font-bold tracking-widest text-secondary uppercase">
                                Step 2 of 3
                            </p>
                            <h2
                                id="setup-duration-title"
                                className="mt-2 font-display text-lg font-bold text-on-surface"
                            >
                                How long should it stay open?
                            </h2>
                            <p className="mt-1 text-xs text-on-surface-variant">
                                Choose a preset or set your own closing time.
                            </p>
                            <div
                                className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6"
                                role="radiogroup"
                                aria-label="Room duration"
                            >
                                {durationChoices.map((choice) => (
                                    <ChoiceCard
                                        key={choice.value}
                                        checked={data.end_mode === choice.value}
                                        onChange={() =>
                                            setData('end_mode', choice.value)
                                        }
                                        title={choice.title}
                                        compact={true}
                                        className="sm:col-span-2"
                                    />
                                ))}
                                <ChoiceCard
                                    checked={data.end_mode === 'custom'}
                                    onChange={() =>
                                        setData('end_mode', 'custom')
                                    }
                                    title="Choose a date"
                                    compact={true}
                                    className="sm:col-span-2 sm:col-start-3"
                                />
                            </div>
                            {data.end_mode === 'custom' && (
                                <div className="mt-3 rounded-xl border border-secondary/30 bg-secondary/5 p-3">
                                    <label
                                        className="block text-xs font-semibold text-on-surface"
                                        htmlFor="custom-ends-at"
                                    >
                                        Room closing time
                                    </label>
                                    <input
                                        id="custom-ends-at"
                                        type="datetime-local"
                                        value={data.custom_ends_at}
                                        onChange={(event) =>
                                            setData(
                                                'custom_ends_at',
                                                event.target.value,
                                            )
                                        }
                                        className="kinetic-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:border-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                                    />
                                    {errors.custom_ends_at && (
                                        <p className="mt-2 text-xs text-error">
                                            {errors.custom_ends_at}
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {step === 2 && (
                        <section aria-labelledby="setup-finish-title">
                            <p className="font-mono text-[10px] font-bold tracking-widest text-secondary uppercase">
                                Step 3 of 3
                            </p>
                            <h2
                                id="setup-finish-title"
                                className="mt-2 font-display text-lg font-bold text-on-surface"
                            >
                                Keep the results
                            </h2>
                            <p className="mt-1 text-xs text-on-surface-variant">
                                Archived rooms stay read-only until their
                                results expire.
                            </p>
                            <label
                                className="mt-4 block"
                                htmlFor="retention-days"
                            >
                                <span className="mb-1.5 block text-xs font-semibold text-on-surface">
                                    Results retention
                                </span>
                                <select
                                    id="retention-days"
                                    value={
                                        data.retention_days === null
                                            ? 'forever'
                                            : String(data.retention_days)
                                    }
                                    onChange={(event) =>
                                        setData(
                                            'retention_days',
                                            event.target.value === 'forever'
                                                ? null
                                                : Number(event.target.value),
                                        )
                                    }
                                    className="kinetic-input w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:border-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                                >
                                    <option value="1">
                                        Delete after 1 day
                                    </option>
                                    <option value="2">
                                        Delete after 2 days
                                    </option>
                                    <option value="30">
                                        Delete after 30 days
                                    </option>
                                    <option value="180">
                                        Delete after 6 months
                                    </option>
                                    <option value="forever">
                                        Keep until I delete them
                                    </option>
                                </select>
                            </label>
                            <div className="mt-4 rounded-xl border border-secondary/20 bg-secondary/5 px-3 py-3">
                                <p className="font-mono text-[10px] font-bold tracking-widest text-secondary uppercase">
                                    Room plan
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                                    {selectedAccess} · {selectedDuration}
                                </p>
                            </div>
                        </section>
                    )}

                    {errorMessage && (
                        <div
                            className="mt-4 rounded-lg border border-error/30 bg-error-container/20 p-3 text-xs text-error"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                        <button
                            type="button"
                            onClick={() =>
                                setStep((current) => Math.max(0, current - 1))
                            }
                            className={`rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-on-surface-variant transition-colors hover:border-white/25 hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${step === 0 ? 'invisible' : ''}`}
                        >
                            Back
                        </button>
                        {step < setupSteps.length - 1 ? (
                            <button
                                type="button"
                                onClick={() =>
                                    setStep((current) =>
                                        Math.min(
                                            setupSteps.length - 1,
                                            current + 1,
                                        ),
                                    )
                                }
                                className="inline-flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2.5 text-xs font-bold text-on-primary-container shadow-[0_0_20px_rgba(78,222,163,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(78,222,163,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:scale-95"
                            >
                                Continue
                                <span
                                    className="material-symbols-outlined text-[17px]"
                                    aria-hidden="true"
                                >
                                    arrow_forward
                                </span>
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2.5 text-xs font-bold text-on-primary-container shadow-[0_0_20px_rgba(78,222,163,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(78,222,163,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {processing
                                    ? 'Creating room...'
                                    : 'Create room'}
                                <span
                                    className="material-symbols-outlined text-[17px]"
                                    aria-hidden="true"
                                >
                                    arrow_forward
                                </span>
                            </button>
                        )}
                    </div>
                </form>

                <div className="mt-5 text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1 font-mono text-xs text-on-surface-variant transition-colors hover:text-secondary"
                    >
                        <span
                            className="material-symbols-outlined text-[14px]"
                            aria-hidden="true"
                        >
                            arrow_back
                        </span>
                        <span>Back to home</span>
                    </Link>
                </div>
            </div>
        </main>
    );
}
