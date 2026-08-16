import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

type Action = 'move' | 'role' | 'ban';
type GroupOption = { id: number; name: string };
type MemberOption = { id: number; name: string; groupName: string };

type Props = {
    /** null = show the action chooser first (person click). */
    action: Action | null;
    members: MemberOption[];
    groups: GroupOption[];
    roles: string[];
    initialValue?: string;
    onClose: () => void;
    onConfirm: (action: Action, value: string) => void;
};

const COPY: Record<Action, { title: string; description: string; confirm: string }> = {
    move: {
        title: 'Move participants',
        description: 'Choose where the selected participants should go.',
        confirm: 'Move participants',
    },
    role: {
        title: 'Assign a custom role',
        description: 'Custom grants add to each participant’s base permissions.',
        confirm: 'Save role',
    },
    ban: {
        title: 'Ban participants',
        description: 'Banned participants are removed from their groups and cannot rejoin this session.',
        confirm: 'Ban participants',
    },
};

const CHOICE_ORDER: Action[] = ['move', 'role', 'ban'];

const CHOICE_COPY: Record<Action, { label: string; hint: string }> = {
    move: { label: 'Move', hint: 'Send to another group or back to the pool' },
    role: { label: 'Assign role', hint: 'Grant a custom permission set' },
    ban: { label: 'Ban', hint: 'Remove and block from rejoining' },
};

function useLatest<T>(value: T) {
    const ref = useRef(value);
    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
}

export default function MemberActionDialog({
    action,
    members,
    groups,
    roles,
    initialValue,
    onClose,
    onConfirm,
}: Props) {
    const [chosen, setChosen] = useState<Action | null>(action);
    const [value, setValue] = useState(
        action === 'move' ? 'pool' : (initialValue ?? ''),
    );
    const onCloseRef = useLatest(onClose);
    const activeAction = chosen ?? action;

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onCloseRef.current();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onCloseRef]);

    const pick = (next: Action) => {
        setChosen(next);
        setValue(next === 'move' ? 'pool' : '');
    };

    const title =
        activeAction === null ? 'Participant actions' : COPY[activeAction].title;
    const description =
        activeAction === null
            ? 'Choose what to do with the selected participant(s).'
            : COPY[activeAction].description;
    const roleAvailable = roles.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#020618]/80 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="member-action-title"
                className="w-full max-w-lg rounded-2xl border border-white/15 bg-surface-container-low p-5 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                        <h2 id="member-action-title" className="font-display text-lg font-bold text-on-surface">
                            {title}
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{description}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-2 py-1 text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-on-surface"
                        aria-label="Close dialog"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-surface-container-lowest p-3">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Selected</p>
                    <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-on-surface">
                        {members.map((member) => (
                            <li key={member.id} className="flex items-center justify-between gap-3">
                                <span className="truncate font-semibold">{member.name}</span>
                                <span className="shrink-0 text-on-surface-variant">{member.groupName}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {activeAction === null ? (
                    <div className="mt-4 space-y-2">
                        {CHOICE_ORDER.map((choice, index) => {
                            const disabled = choice === 'role' && !roleAvailable;
                            const copy = CHOICE_COPY[choice];

                            return (
                                <button
                                    key={choice}
                                    type="button"
                                    autoFocus={index === 0}
                                    disabled={disabled}
                                    onClick={() => pick(choice)}
                                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                        choice === 'ban'
                                            ? 'border-error/25 bg-error-container/10 hover:border-error/50 hover:bg-error-container/20'
                                            : 'border-white/10 bg-surface-container-lowest hover:border-secondary/50 hover:bg-secondary/5'
                                    }`}
                                >
                                    <span>
                                        <span className="block text-xs font-semibold text-on-surface">
                                            {copy.label}
                                        </span>
                                        <span className="mt-0.5 block text-[10px] text-on-surface-variant">
                                            {copy.hint}
                                        </span>
                                    </span>
                                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                                        chevron_right
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <>
                        {activeAction === 'move' && (
                            <label className="mt-4 block">
                                <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Destination</span>
                                <select
                                    autoFocus
                                    value={value}
                                    onChange={(event) => setValue(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary"
                                >
                                    <option value="pool">Unassigned pool</option>
                                    {groups.map((group) => (
                                        <option key={group.id} value={String(group.id)}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}

                        {activeAction === 'role' && (
                            <label className="mt-4 block">
                                <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Custom role</span>
                                <select
                                    autoFocus
                                    value={value}
                                    onChange={(event) => setValue(event.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary"
                                >
                                    <option value="">No custom role</option>
                                    {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                                </select>
                            </label>
                        )}

                        {activeAction === 'ban' && (
                            <div className="mt-4 rounded-xl border border-error/30 bg-error-container/15 p-3 text-xs leading-relaxed text-error">
                                This action affects {members.length === 1 ? 'this participant' : `all ${members.length} selected participants`} immediately.
                            </div>
                        )}
                    </>
                )}

                {activeAction !== null && (
                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-variant/40 hover:text-on-surface"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => onConfirm(activeAction, value)}
                            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-colors hover:brightness-110 ${activeAction === 'ban' ? 'bg-error text-white' : 'bg-secondary text-on-secondary'}`}
                        >
                            {COPY[activeAction].confirm}
                        </button>
                    </div>
                )}
            </section>
        </motion.div>
    );
}
