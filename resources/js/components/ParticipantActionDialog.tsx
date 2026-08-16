import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';

type Action = 'move' | 'role' | 'ban';

type Props = {
    name: string;
    onClose: () => void;
    onChoose: (action: Action) => void;
};

const ACTIONS: { action: Action; icon: string; title: string; description: string }[] = [
    { action: 'move', icon: 'drive_file_move', title: 'Move participant', description: 'Place them in a group or return them to the pool.' },
    { action: 'role', icon: 'badge', title: 'Assign custom role', description: 'Give this participant additional session permissions.' },
    { action: 'ban', icon: 'person_off', title: 'Ban participant', description: 'Remove them and prevent them from rejoining.' },
];

export default function ParticipantActionDialog({ name, onClose, onChoose }: Props) {
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        closeRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
onClose();
}
        };
        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

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
                aria-labelledby="participant-actions-title"
                className="w-full max-w-md rounded-2xl border border-white/15 bg-surface-container-low p-5 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                        <p className="font-mono text-[10px] font-bold tracking-widest text-secondary uppercase">Participant</p>
                        <h2 id="participant-actions-title" className="mt-1 font-display text-lg font-bold text-on-surface">{name}</h2>
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-2 py-1 text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-on-surface"
                        aria-label="Close participant actions"
                    >
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                    </button>
                </div>

                <div className="mt-4 grid gap-2">
                    {ACTIONS.map((item) => (
                        <button
                            key={item.action}
                            type="button"
                            onClick={() => onChoose(item.action)}
                            className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${item.action === 'ban' ? 'border-error/25 hover:bg-error-container/15' : 'border-white/10 hover:border-secondary/40 hover:bg-secondary/5'}`}
                        >
                            <span className={`material-symbols-outlined text-[20px] ${item.action === 'ban' ? 'text-error' : 'text-secondary'}`} aria-hidden="true">{item.icon}</span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-on-surface">{item.title}</span>
                                <span className="mt-0.5 block text-xs text-on-surface-variant">{item.description}</span>
                            </span>
                            <span className="material-symbols-outlined ml-auto text-[17px] text-on-surface-variant" aria-hidden="true">arrow_forward</span>
                        </button>
                    ))}
                </div>
            </section>
        </motion.div>
    );
}
