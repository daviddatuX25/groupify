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

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-container-lowest px-3.5 py-2.5">
            <span className="text-xs font-medium text-on-surface">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => onChange(!on)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-primary-container' : 'bg-surface-variant'}`}
            >
                <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-4' : 'left-0.5'}`}
                />
            </button>
        </label>
    );
}

function Select({
    value,
    onChange,
    options,
    label,
}: {
    value: string;
    onChange: (v: string) => void;
    options: [string, string][];
    label: string;
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-xs text-on-surface outline-none focus:border-secondary"
            >
                {options.map(([v, l]) => (
                    <option key={v} value={v}>
                        {l}
                    </option>
                ))}
            </select>
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
                    <label className="flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Group size (min)</span>
                        <input
                            type="number"
                            min={1}
                            value={Number(rule(draft, 'min_members', 1))}
                            onChange={(e) => set('min_members', Number(e.target.value))}
                            className="rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-xs text-on-surface outline-none focus:border-secondary"
                        />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Group size (max)</span>
                        <input
                            type="number"
                            min={1}
                            value={Number(rule(draft, 'max_members', 5))}
                            onChange={(e) => set('max_members', Number(e.target.value))}
                            className="rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-xs text-on-surface outline-none focus:border-secondary"
                        />
                    </label>

                    <Select
                        label="Join mode"
                        value={String(rule(draft, 'join_mode', 'open'))}
                        onChange={(v) => set('join_mode', v)}
                        options={[
                            ['open', 'Open — anyone can join groups'],
                            ['approval', 'Approval — leaders screen requests'],
                        ]}
                    />
                    <Select
                        label="Group naming"
                        value={String(rule(draft, 'naming', 'auto'))}
                        onChange={(v) => set('naming', v)}
                        options={[
                            ['auto', 'Auto (Team Alpha, …)'],
                            ['leader', 'Leaders name their groups'],
                        ]}
                    />

                    <label className="flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Auto-dissolve (minutes)</span>
                        <input
                            type="number"
                            min={1}
                            placeholder="off"
                            value={rule(draft, 'auto_dissolve_minutes', null) === null ? '' : Number(rule(draft, 'auto_dissolve_minutes', 0))}
                            onChange={(e) => set('auto_dissolve_minutes', e.target.value === '' ? null : Number(e.target.value))}
                            className="rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-xs text-on-surface outline-none focus:border-secondary"
                        />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Guest list (comma-separated)</span>
                        <input
                            type="text"
                            value={(rule(draft, 'guest_list', []) as string[]).join(', ')}
                            onChange={(e) => set('guest_list', e.target.value.split(',').map((n) => n.trim()).filter(Boolean))}
                            className="rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-xs text-on-surface outline-none focus:border-secondary"
                        />
                    </label>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <Toggle on={Boolean(rule(draft, 'allow_user_creation', true))} onChange={(v) => set('allow_user_creation', v)} label="Participants can create groups" />
                    <Toggle on={Boolean(rule(draft, 'anonymous_mode', false))} onChange={(v) => set('anonymous_mode', v)} label="Anonymous mode (alias identities)" />
                    <Toggle on={Boolean(rule(draft, 'chat_enabled', false))} onChange={(v) => set('chat_enabled', v)} label="Chat enabled (room + group channels)" />
                    <Toggle on={Boolean(rule(draft, 'freeze', false))} onChange={(v) => set('freeze', v)} label="Frozen (board read-only)" />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <Select
                        label="Group chat mode"
                        value={String(rule(draft, 'group_chat_mode', 'open'))}
                        onChange={(v) => set('group_chat_mode', v)}
                        options={[
                            ['open', 'Open — all members post'],
                            ['leader', 'Leader-only posting'],
                        ]}
                    />
                    <Select
                        label="Room chat mode"
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
