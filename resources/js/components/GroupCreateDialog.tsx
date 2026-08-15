import { useEffect, useRef } from 'react';

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
    onClose,
    onSubmit,
    submitLabel,
}: Props) {
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        closeRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#020618]/80 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
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
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-2 py-1 text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-on-surface"
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
                    <label className="block">
                        <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Group name</span>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(event) => onNameChange(event.target.value)}
                            aria-describedby="group-name-help"
                            className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-secondary"
                        />
                        <span id="group-name-help" className="mt-1.5 block text-[10px] leading-relaxed text-on-surface-variant/70">
                            Leave blank to use the next suggested team name.
                        </span>
                    </label>

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
                                        className={`rounded-xl border p-3 text-left transition-colors ${
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
                                className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-secondary"
                            />
                        </label>
                    ))}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-variant/40 hover:text-on-surface"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="rounded-xl bg-secondary px-4 py-2.5 text-xs font-bold text-on-secondary transition-colors hover:brightness-110">
                            {submitLabel}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
