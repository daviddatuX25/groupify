import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

type Field = {
    name: string;
    type: string;
    required?: boolean;
};

type CapacityOption = {
    value: string;
    label: string;
    hint: string;
};

type Props = {
    title: string;
    description: string;
    name: string;
    onNameChange: (value: string) => void;
    fields?: Field[];
    fieldValues?: Record<string, string>;
    onFieldChange?: (name: string, value: string) => void;
    capacity?: string;
    capacityOptions?: CapacityOption[];
    onCapacityChange?: (value: string) => void;
    count?: string;
    onCountChange?: (value: string) => void;
    randomNames?: boolean;
    onRandomNamesChange?: (value: boolean) => void;
    busy?: boolean;
    error?: string | null;
    onClearError?: () => void;
    onClose: () => void;
    onSubmit: () => void;
    submitLabel: string;
};

export default function GroupCreateDialog({
    title,
    description,
    name,
    onNameChange,
    fields = [],
    fieldValues = {},
    onFieldChange,
    capacity,
    capacityOptions = [],
    onCapacityChange,
    count = '1',
    onCountChange,
    randomNames = false,
    onRandomNamesChange,
    busy = false,
    error = null,
    onClearError,
    onClose,
    onSubmit,
    submitLabel,
}: Props) {
    const [multiple, setMultiple] = useState(false);
    const countValue = Number(count);
    const nameVisible = !multiple || (countValue === 1 && !randomNames);

    // Read busy through a ref so the once-subscribed Escape handler never
    // closes the dialog from a stale value between render and effect re-run.
    const busyRef = useRef(busy);

    useEffect(() => {
        busyRef.current = busy;
    }, [busy]);

    // Escape closes unless a request is in flight; never focuses the Close
    // button (which used to steal focus on every parent re-render).
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !busyRef.current) {
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const collapseMultiple = () => {
        setMultiple(false);
        onCountChange?.('1');
        onRandomNamesChange?.(false);
        onClearError?.();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#020618]/80 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (!busy && event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="group-create-dialog-title"
                className="w-full max-w-lg rounded-2xl border border-white/15 bg-surface-container-low p-5 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                        <h2 id="group-create-dialog-title" className="font-display text-lg font-bold text-on-surface">
                            {title}
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{description}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-lg px-2 py-1 text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Close dialog"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                <form
                    className="mt-5 space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                >
                    {nameVisible && (
                        <label className="block">
                            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Group name</span>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(event) => onNameChange(event.target.value)}
                                disabled={busy}
                                aria-describedby="group-name-help"
                                className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-secondary disabled:cursor-not-allowed disabled:opacity-40"
                            />
                            <span id="group-name-help" className="mt-1.5 block text-[10px] leading-relaxed text-on-surface-variant/70">
                                Leave blank to use the next suggested team name.
                            </span>
                        </label>
                    )}

                    {!nameVisible && (
                        <p className="text-[10px] leading-relaxed text-on-surface-variant/70">
                            {name.trim() !== ''
                                ? `Manual name “${name.trim()}” is kept and reappears for single creation.`
                                : 'Manual naming applies to single-group creation only.'}
                        </p>
                    )}

                    {onCountChange && onRandomNamesChange && (
                        <div className="rounded-xl border border-white/10 p-3">
                            <button
                                type="button"
                                onClick={() => (multiple ? collapseMultiple() : setMultiple(true))}
                                disabled={busy}
                                aria-expanded={multiple}
                                className="flex w-full items-center justify-between gap-2 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <span>Create multiple</span>
                                <span className="material-symbols-outlined text-[16px]">
                                    {multiple ? 'expand_less' : 'expand_more'}
                                </span>
                            </button>
                            {multiple && (
                                <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                                    <label className="block">
                                        <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Number of groups</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={200}
                                            step={1}
                                            value={count}
                                            onChange={(event) => onCountChange(event.target.value)}
                                            disabled={busy}
                                            className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-secondary disabled:cursor-not-allowed disabled:opacity-40"
                                        />
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={randomNames}
                                            onChange={(event) => onRandomNamesChange(event.target.checked)}
                                            disabled={busy}
                                            className="h-4 w-4 accent-secondary"
                                        />
                                        <span className="text-xs font-semibold text-on-surface">Use random generated names</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {capacityOptions.length > 0 && onCapacityChange && (
                        <fieldset>
                            <legend className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Capacity</legend>
                            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Group capacity">
                                {capacityOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={capacity === option.value}
                                        onClick={() => onCapacityChange(option.value)}
                                        disabled={busy}
                                        className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                            capacity === option.value
                                                ? 'border-secondary/60 bg-secondary/10 text-secondary'
                                                : 'border-white/10 bg-surface-container-lowest text-on-surface hover:border-white/25'
                                        }`}
                                    >
                                        <span className="block text-xs font-semibold">{option.label}</span>
                                        <span className="mt-1 block text-[10px] text-on-surface-variant">{option.hint}</span>
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    )}

                    {fields.map((field) => (
                        <label key={field.name} className="block">
                            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                {field.name}{field.required ? ' *' : ''}
                            </span>
                            <input
                                type={field.type === 'email' ? 'email' : 'text'}
                                required={field.required}
                                value={fieldValues[field.name] ?? ''}
                                onChange={(event) => onFieldChange?.(field.name, event.target.value)}
                                disabled={busy}
                                className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-secondary disabled:cursor-not-allowed disabled:opacity-40"
                            />
                        </label>
                    ))}

                    {error && (
                        <p role="alert" className="rounded-lg border border-error/30 bg-error-container/15 px-3 py-2 text-xs font-semibold text-error">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={busy}
                            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-variant/40 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={busy}
                            className="rounded-xl bg-secondary px-4 py-2.5 text-xs font-bold text-on-secondary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {busy ? 'Creating…' : submitLabel}
                        </button>
                    </div>
                </form>
            </section>
        </motion.div>
    );
}
