import type { ReactNode } from 'react';

const CATALOG: { key: string; category: string; icon: string; name: string; blurb: string }[] = [
    {
        key: 'quiz',
        category: 'Event',
        icon: 'quiz',
        name: 'Group Quiz',
        blurb: 'Live questions, per-team answers, auto-grading, leaderboard.',
    },
    {
        key: 'match_me',
        category: 'Formation',
        icon: 'bolt',
        name: 'Match Me',
        blurb: 'One-tap auto-assign for pooled participants.',
    },
    {
        key: 'proxy',
        category: 'Formation',
        icon: 'how_to_reg',
        name: 'Proxy Seats',
        blurb: 'Pre-register absentees (field trips) who claim their seat on join.',
    },
    {
        key: 'announcements',
        category: 'Communication',
        icon: 'campaign',
        name: 'Host Announcements',
        blurb: 'Broadcast messages to the whole room.',
    },
    {
        key: 'moderation',
        category: 'Trust',
        icon: 'gavel',
        name: 'Message Moderation',
        blurb: 'Queue + approve/reject room messages.',
    },
];

type Props = {
    extensions: string[];
    onToggle: (key: string, enabled: boolean) => void;
    children?: ReactNode;
};

/**
 * Extensions shelf (flexibility-model.md §3, FR-7.3): first-party,
 * session-toggled modules. Enabled modules' panels render below the shelf.
 */
export default function ExtensionsShelf({ extensions, onToggle, children }: Props) {
    return (
        <div className="space-y-6">
            <section className="glass-card rounded-2xl p-5 shadow-xl">
                <div className="border-b border-white/10 pb-3">
                    <h3 className="font-display text-base font-bold text-on-surface">Extensions</h3>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                        Optional modules for this session only — enable what tonight needs; other sessions stay bare.
                    </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {CATALOG.map((ext) => {
                        const on = extensions.includes(ext.key);
                        return (
                            <div
                                key={ext.key}
                                className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-all ${
                                    on ? 'border-primary/40 bg-primary/5' : 'border-white/10 bg-surface-container-lowest'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className={`material-symbols-outlined text-[22px] ${on ? 'text-primary' : 'text-on-surface-variant'}`}>
                                        {ext.icon}
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-display text-sm font-bold text-on-surface">{ext.name}</h4>
                                            <span className="rounded bg-surface-variant px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-on-surface-variant">
                                                {ext.category}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{ext.blurb}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={on}
                                    aria-label={`toggle ${ext.name}`}
                                    onClick={() => onToggle(ext.key, !on)}
                                    className={`relative h-6 w-11 self-end rounded-full transition-colors ${
                                        on ? 'bg-primary-container' : 'bg-surface-variant'
                                    }`}
                                >
                                    <span
                                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                            on ? 'left-5' : 'left-0.5'
                                        }`}
                                    />
                                </button>
                            </div>
                        );
                    })}
                </div>
                <p className="mt-3 text-[11px] text-on-surface-variant/60">
                    Chat tiers (room + group chat) live under Configuration → Session Rules.
                </p>
            </section>

            {children}
        </div>
    );
}
