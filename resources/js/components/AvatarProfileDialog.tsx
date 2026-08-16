import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import { AVATAR_STYLES  } from '@/lib/avatars';
import type {AvatarStyle} from '@/lib/avatars';

type Props = {
    name: string;
    style: AvatarStyle;
    seed: string;
    saving?: boolean;
    onClose: () => void;
    onSave: (style: AvatarStyle, seed: string) => void;
};

export default function AvatarProfileDialog({ name, style, seed, saving = false, onClose, onSave }: Props) {
    const [draftStyle, setDraftStyle] = useState(style);
    const [draftSeed, setDraftSeed] = useState(seed);
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
                if (event.target === event.currentTarget && !saving) {
onClose();
}
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="avatar-profile-title"
                className="w-full max-w-md rounded-2xl border border-white/15 bg-surface-container-low p-5 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                        <h2 id="avatar-profile-title" className="font-display text-lg font-bold text-on-surface">
                            Customize your profile
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                            Pick a look and a seed. Your choice stays with this room identity.
                        </p>
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg px-2 py-1 text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-on-surface disabled:opacity-40"
                        aria-label="Close profile customization"
                    >
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                    </button>
                </div>

                <div className="mt-5 flex items-center gap-4 rounded-xl border border-white/10 bg-surface-container-lowest p-4">
                    <ParticipantAvatar name={name} avatar={{ style: draftStyle, seed: draftSeed }} size="lg" />
                    <div>
                        <p className="font-display text-base font-bold text-on-surface">{name}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">This is how others see you on the board.</p>
                    </div>
                </div>

                <label className="mt-4 block">
                    <span className="mb-1.5 block font-mono text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                        Avatar style
                    </span>
                    <select
                        value={draftStyle}
                        onChange={(event) => setDraftStyle(event.target.value as AvatarStyle)}
                        className="kinetic-select w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                    >
                        {AVATAR_STYLES.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>

                <label className="mt-4 block">
                    <span className="mb-1.5 block font-mono text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                        Avatar seed
                    </span>
                    <input
                        type="text"
                        value={draftSeed}
                        maxLength={48}
                        onChange={(event) => setDraftSeed(event.target.value)}
                        className="kinetic-input w-full rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                        placeholder="Choose a word or nickname"
                    />
                    <span className="mt-1.5 block text-[11px] text-on-surface-variant">
                        The same seed always produces the same avatar.
                    </span>
                </label>

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-variant/40 hover:text-on-surface disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onSave(draftStyle, draftSeed.trim() || name)}
                        disabled={saving || !draftSeed.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-container px-4 py-2.5 text-xs font-bold text-on-primary-container transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {saving ? 'Saving…' : 'Save profile'}
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">check</span>
                    </button>
                </div>
            </section>
        </motion.div>
    );
}
