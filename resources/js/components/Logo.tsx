import { cn } from '@/lib/utils';

/** Kinetic mark: three nodes on an orbit — motion, formation. */
export function Logo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 64 64"
            className={cn('h-8 w-8', className)}
            role="img"
            aria-label="Groupify"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle cx="32" cy="32" r="25.5" stroke="#4edea3" strokeOpacity="0.32" strokeWidth="2.5" />
            <circle cx="32" cy="6.5" r="6.2" fill="#4edea3" />
            <circle cx="54.1" cy="44.4" r="6.2" fill="#4edea3" fillOpacity="0.62" />
            <circle cx="9.9" cy="44.4" r="6.2" fill="#4edea3" fillOpacity="0.28" />
        </svg>
    );
}
