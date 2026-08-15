import { cn } from '@/lib/utils';

/** Kinetic mark: three nodes on an orbit — motion, formation. */
export function Logo({ className, animated = false }: { className?: string; animated?: boolean }) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(
                'h-8 w-8 text-primary drop-shadow-[0_0_16px_rgba(109,252,87,0.3)]',
                animated && 'animate-[spin_24s_linear_infinite]',
                className
            )}
            role="img"
            aria-label="Groupify"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle cx="50" cy="50" opacity="0.5" r="40" stroke="currentColor" strokeDasharray="8 8" strokeWidth="2.5" />
            <circle cx="50" cy="10" fill="#6dfc57" r="8" />
            <circle cx="15" cy="70" fill="#4cd7f6" r="7" />
            <circle cx="85" cy="70" fill="#ffd3e1" r="9" />
            <circle cx="50" cy="50" fill="#171f33" r="16" stroke="currentColor" strokeWidth="2" />
            <circle cx="50" cy="50" fill="#6dfc57" r="5" />
        </svg>
    );
}
