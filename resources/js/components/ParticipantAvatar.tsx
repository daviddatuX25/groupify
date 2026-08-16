import { motion } from 'motion/react';
import { useState } from 'react';
import { avatarSeed, avatarUrl } from '@/lib/avatars';
import type { AvatarData } from '@/lib/avatars';

type Props = {
    name: string;
    avatar?: AvatarData | null;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    /** Online presence — renders a green pulse ring (ties to live presence). */
    presence?: boolean;
    /** Group leader — renders a crown chip. */
    leader?: boolean;
};

const SIZE_CLASSES = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-xl',
} as const;

/**
 * DiceBear avatar with the presentation layer (plan §3): presence pulse,
 * leader crown, hover lift. Falls back to initials when the remote image
 * fails (offline mode).
 */
export default function ParticipantAvatar({
    name,
    avatar,
    size = 'md',
    className = '',
    presence = false,
    leader = false,
}: Props) {
    const [failed, setFailed] = useState(false);
    const initials = avatarSeed(name).slice(0, 1).toUpperCase();

    const inner = failed ? (
        <span
            className={`inline-flex shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 font-display font-bold text-primary ${SIZE_CLASSES[size]} ${className}`}
            aria-hidden="true"
        >
            {initials}
        </span>
    ) : (
        <img
            src={avatarUrl(name, avatar)}
            alt=""
            width={size === 'lg' ? 64 : size === 'md' ? 40 : 28}
            height={size === 'lg' ? 64 : size === 'md' ? 40 : 28}
            loading="lazy"
            onError={() => setFailed(true)}
            className={`shrink-0 rounded-full border border-white/15 bg-surface-container object-cover ${SIZE_CLASSES[size]} ${className}`}
        />
    );

    return (
        <motion.span
            whileHover={{ scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={`relative inline-flex shrink-0 items-center justify-center ${presence ? 'rounded-full' : ''}`}
        >
            {inner}
            {presence && (
                <motion.span
                    aria-hidden="true"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0.15, 0.6] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary"
                />
            )}
            {leader && (
                <span
                    aria-label="leader"
                    className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] text-on-secondary shadow"
                >
                    ★
                </span>
            )}
        </motion.span>
    );
}
