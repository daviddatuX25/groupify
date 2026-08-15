import { useState } from 'react';
import { avatarSeed, avatarUrl  } from '@/lib/avatars';
import type {AvatarData} from '@/lib/avatars';

type Props = {
    name: string;
    avatar?: AvatarData | null;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

const SIZE_CLASSES = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-xl',
} as const;

export default function ParticipantAvatar({ name, avatar, size = 'md', className = '' }: Props) {
    const [failed, setFailed] = useState(false);
    const initials = avatarSeed(name).slice(0, 1).toUpperCase();

    return failed ? (
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
}
