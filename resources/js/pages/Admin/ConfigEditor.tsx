import { useState } from 'react';

type Field = {
    name: string;
    type: string;
    required?: boolean;
    filled_by?: string;
    on_card?: boolean;
    in_csv?: boolean;
    filterable?: boolean;
};

type Props = {
    rules: Record<string, unknown>;
    fields: Field[];
    onSave: (payload: Record<string, unknown>) => void;
};

const rule = (r: Record<string, unknown>, k: string, fallback: unknown) => r[k] ?? fallback;

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-container-lowest px-3.5 py-2.5">
            <span>
                <span className="block text-xs font-medium text-on-surface">{label}</span>
                {hint && <span className="mt-0.5 block max-w-[34ch] text-[10px] leading-relaxed text-on-surface-variant/70">{hint}</span>}
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => onChange(!on)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-primary-container' : 'bg-surface-variant'}`}
            >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-4' : 'left-0.5'}`} />
            </button>
        </label>
    );
}

function Select({
    value,
    onChange,
    options,
    label,
    hint,
}: {
    value: string;
    onChange: (v: string) => void;
    options: [string, string][];
    label: string;
    hint?: string;
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</span>
            <span className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 pr-9 text-xs text-on-surface outline-none transition-colors focus:border-secondary"
                >
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant">expand_more</span>
            </span>
            {hint && <span className="text-[10px] leading-relaxed text-on-surface-variant/70">ⓘ {hint}</span>}
        </label>
    );
}

/**
 * The configuration interface (flexibility-model.md §2-3): the session config
 * object is the single source of truth — rules and fields are edited here.
 */
export default function ConfigEditor({ rules, fields, onSave }: Props) {
    const [draft, setDraft] = useState<Record<string, unknown>>({ ...rules });
    const [fieldDrafts, setFieldDrafts] = useState<Field[]>(fields);
    const [newField, setNewField] = useState<Field>({ name: '', type: 'text' });

    const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

    const saveRules = () => onSave({ rules: draft });
    const saveFields = () => onSave({ fields: fieldDrafts.map((f) => ({ ...f })) });

    const minMembers = Number(rule(draft, 'min_members', 1));
    const maxMembers = Number(rule(draft, 'max_members', 5));
    const sizePreset = minMembers === maxMembers && (minMembers === 1 || minMembers === 2) ? String(minMembers) : 'custom';
    const dissolveMinutes = rule(draft, 'auto_dissolve_minutes', null);
    const guestList = (rule(draft, 'guest_list', []) as string[]).filter(Boolean);

    const setGroupPreset = (preset: string) => {
        if (preset === '1' || preset === '2') {
            setDraft((current) => ({ ...current, min_members: Number(preset), max_members: Number(preset) }));
        }
    };

    return (
        <div className="space-y-6">
            {/* ---- Rules ---- */}
            <section className="glass-card rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="font-display text-base font-bold text-on-surface">Session Rules</h3>
                    <button
                        type="button"
                        onClick={saveRules}
                        className="rounded-xl bg-primary-container px-4 py-2 font-display text-xs font-bold text-on-primary-container shadow-[0_0_15px_rgba(78,222,61,0.25)] hover:brightness-110"
                    >
                        Save Rules
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-surface-container-lowest p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Group size</span>
                                <p className="mt-1 text-xs text-on-surface-variant">Choose a fixed team size or let the facilitator set a range.</p>
                            </div>
                            <span className="rounded-full bg-secondary/10 px-2.5 py-1 font-mono text-[11px] font-bold text-secondary">
                                {sizePreset === 'custom' ? `${minMembers}–${maxMembers} people` : `${minMembers} ${minMembers === 1 ? 'person' : 'people'}`}
                            </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Group size preset">
                            {[
                                ['1', '1 person', 'Solo groups'],
                                ['2', '2 people', 'Pairs'],
                                ['custom', 'Custom', 'Set a range'],
                            ].map(([value, label, hint]) => (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={sizePreset === value}
                                    onClick={() => setGroupPreset(value)}
                                    className={`rounded-xl border p-3 text-left transition-colors ${
                                        sizePreset === value
                                            ? 'border-secondary/60 bg-secondary/10 text-secondary'
                                            : 'border-white/10 bg-surface-container-low hover:border-white/25 text-on-surface'
                                    }`}
                                >
                                    <span className="block text-xs font-semibold">{label}</span>
                                    <span className="mt-1 block text-[10px] text-on-surface-variant">{hint}</span>
                                </button>
                            ))}
                        </div>
                        {sizePreset === 'custom' && (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="flex items-center justify-between text-[11px] text-on-surface-variant">
                                        <span>Minimum</span><strong className="font-mono text-secondary">{minMembers}</strong>
                                    </span>
                                    <input
                                        type="range"
                                        min={1}
                                        max={Math.max(1, maxMembers)}
                                        value={minMembers}
                                        onChange={(e) => setDraft((current) => ({ ...current, min_members: Math.min(Number(e.target.value), maxMembers) }))}
                                        className="w-full accent-secondary"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="flex items-center justify-between text-[11px] text-on-surface-variant">
                                        <span>Maximum</span><strong className="font-mono text-secondary">{maxMembers}</strong>
                                    </span>
                                    <input
                                        type="range"
                                        min={Math.max(1, minMembers)}
                                        max={50}
                                        value={maxMembers}
                                        onChange={(e) => setDraft((current) => ({ ...current, max_members: Math.max(Number(e.target.value), minMembers) }))}
                                        className="w-full accent-secondary"
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    <Select
                        label="Join mode"
                        hint="Open seats immediately. Approval lets a leader review requests."
                        value={String(rule(draft, 'join_mode', 'open'))}
                        onChange={(v) => set('join_mode', v)}
                        options={[
                            ['open', 'Open — anyone can join groups'],
                            ['approval', 'Approval — leaders screen requests'],
                        ]}
                    />
                    <Select
                        label="Group naming"
                        hint="Controls the default names used when teams are created."
                        value={String(rule(draft, 'naming', 'auto'))}
                        onChange={(v) => set('naming', v)}
                        options={[
                            ['auto', 'Auto (Team Alpha, …)'],
                            ['leader', 'Leaders name their groups'],
                        ]}
                    />

                    <div className="rounded-2xl border border-white/10 bg-surface-container-lowest p-4">
                        <Toggle
                            on={dissolveMinutes !== null}
                            onChange={(enabled) => set('auto_dissolve_minutes', enabled ? (Number(dissolveMinutes) || 10) : null)}
                            label="Auto-dissolve"
                            hint="Return everyone to the pool after a quiet interval."
                        />
                        {dissolveMinutes !== null && (
                            <label className="mt-3 block space-y-2">
                                <span className="flex items-center justify-between text-[11px] text-on-surface-variant">
                                    <span>Timer</span><strong className="font-mono text-tertiary">{Number(dissolveMinutes)} min</strong>
                                </span>
                                <input
                                    type="range"
                                    min={1}
                                    max={120}
                                    step={1}
                                    value={Number(dissolveMinutes)}
                                    onChange={(e) => set('auto_dissolve_minutes', Number(e.target.value))}
                                    className="w-full accent-tertiary"
                                />
                            </label>
                        )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-surface-container-lowest p-4">
                        <label className="flex flex-col gap-1.5">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Guest list</span>
                            <textarea
                                rows={2}
                                value={guestList.join(', ')}
                                onChange={(e) => set('guest_list', e.target.value.split(/[,\n]/).map((n) => n.trim()).filter(Boolean))}
                                placeholder="Names allowed to join, separated by commas"
                                className="resize-y rounded-xl border border-white/10 bg-surface-container px-3 py-2.5 text-xs text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/45 focus:border-secondary"
                            />
                            <span className="text-[10px] leading-relaxed text-on-surface-variant/70">
                                Empty means anyone with the PIN can enter.
                            </span>
                        </label>
                        {guestList.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {guestList.map((name) => <span key={name} className="rounded-full bg-secondary/10 px-2 py-1 font-mono text-[10px] text-secondary">{name}</span>)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <Toggle on={Boolean(rule(draft, 'allow_user_creation', true))} onChange={(v) => set('allow_user_creation', v)} label="Participants can create groups" hint="When off, only the host can create teams." />
                    <Toggle on={Boolean(rule(draft, 'anonymous_mode', false))} onChange={(v) => set('anonymous_mode', v)} label="Anonymous mode (alias identities)" hint="Participants see aliases; the host retains real names." />
                    <Toggle on={Boolean(rule(draft, 'chat_enabled', false))} onChange={(v) => set('chat_enabled', v)} label="Chat enabled (room + group channels)" hint="Shows the messaging dock and group chat to participants." />
                    <Toggle on={Boolean(rule(draft, 'freeze', false))} onChange={(v) => set('freeze', v)} label="Frozen (board read-only)" hint="Stops joins, leaves, and moves while keeping the board visible." />
                </div>
                    <Toggle
                        on={Boolean(rule(draft, 'qr_pinless', true))}
                        onChange={(v) => set('qr_pinless', v)}
                        label="QR skips PIN"
                        hint="Trusted scans can join without typing the session PIN."
                    />
                    <Select
                        label="Result retention"
                        hint="Archived sessions remain read-only until this deadline."
                        value={String(rule(draft, 'retention_days', 30) ?? 'forever')}
                        onChange={(v) => set('retention_days', v === 'forever' ? null : Number(v))}
                        options={[
                            ['1', '1 day'],
                            ['2', '2 days'],
                            ['30', '30 days'],
                            ['180', '6 months'],
                            ['forever', 'Until manual deletion'],
                        ]}
                    />

                <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <Select
                        label="Group chat mode"
                        hint="Open lets all members write; leader keeps posting focused."
                        value={String(rule(draft, 'group_chat_mode', 'open'))}
                        onChange={(v) => set('group_chat_mode', v)}
                        options={[
                            ['open', 'Open — all members post'],
                            ['leader', 'Leader-only posting'],
                        ]}
                    />
                    <Select
                        label="Room chat mode"
                        hint="Muted is read-only; moderated sends posts to the host queue."
                        value={String(rule(draft, 'global_chat_mode', 'open'))}
                        onChange={(v) => set('global_chat_mode', v)}
                        options={[
                            ['open', 'Open'],
                            ['muted', 'Muted — read only'],
                            ['moderated', 'Moderated — queue'],
                        ]}
                    />
                </div>
            </section>

            {/* ---- Fields ---- */}
            <section className="glass-card rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h3 className="font-display text-base font-bold text-on-surface">Group Fields</h3>
                    <button
                        type="button"
                        onClick={saveFields}
                        className="rounded-xl bg-primary-container px-4 py-2 font-display text-xs font-bold text-on-primary-container shadow-[0_0_15px_rgba(78,222,61,0.25)] hover:brightness-110"
                    >
                        Save Fields
                    </button>
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">
                    Per-group metadata shown on group cards, search, and CSV export (e.g. "Chosen topic").
                </p>

                <div className="mt-4 space-y-2.5">
                    {fieldDrafts.map((f, i) => (
                        <div key={i} className="rounded-xl border border-white/10 bg-surface-container-lowest p-3.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <input
                                    type="text"
                                    value={f.name}
                                    onChange={(e) => setFieldDrafts((d) => d.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                                    placeholder="Field name (e.g. Chosen topic)"
                                    className="flex-1 rounded-lg border border-white/10 bg-surface-container px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                                />
                                <select
                                    value={f.filled_by ?? 'leader'}
                                    onChange={(e) => setFieldDrafts((d) => d.map((x, j) => (j === i ? { ...x, filled_by: e.target.value } : x)))}
                                    className="rounded-lg border border-white/10 bg-surface-container px-2 py-2 text-xs text-on-surface outline-none"
                                >
                                    <option value="leader">Leader fills</option>
                                    <option value="members">Members fill</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setFieldDrafts((d) => d.filter((_, j) => j !== i))}
                                    className="rounded-lg bg-error-container/40 px-2.5 py-1.5 text-xs font-bold text-error hover:bg-error-container"
                                >
                                    Remove
                                </button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                {(
                                    [
                                        ['required', 'Required'],
                                        ['on_card', 'Show on card'],
                                        ['in_csv', 'Include in CSV'],
                                        ['filterable', 'Filterable'],
                                    ] as [keyof Field, string][]
                                ).map(([k, label]) => (
                                    <label key={k} className="flex cursor-pointer items-center gap-1.5 text-[11px] text-on-surface-variant">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(f[k])}
                                            onChange={(e) => setFieldDrafts((d) => d.map((x, j) => (j === i ? { ...x, [k]: e.target.checked } : x)))}
                                            className="accent-primary"
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}

                    {fieldDrafts.length === 0 && (
                        <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-on-surface-variant/60">
                            No fields yet — add one below (e.g. "Chosen topic").
                        </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="text"
                            value={newField.name}
                            onChange={(e) => setNewField((f) => ({ ...f, name: e.target.value }))}
                            placeholder="New field name…"
                            className="flex-1 rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (!newField.name.trim()) return;
                                setFieldDrafts((d) => [...d, { ...newField, name: newField.name.trim() }]);
                                setNewField({ name: '', type: 'text' });
                            }}
                            className="rounded-xl border border-white/10 bg-surface-variant/40 px-4 py-2 font-sans text-xs font-semibold text-on-surface hover:bg-surface-variant"
                        >
                            + Add Field
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
