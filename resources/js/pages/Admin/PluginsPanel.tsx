import type { ReactNode } from 'react';

const FIRST_PARTY: { key: string; category: string; icon: string; name: string; blurb: string }[] = [
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

const AUTHORED_TEASERS = [
    { icon: 'casino', name: 'Spin the Wheel', blurb: 'Randomize with a group-sized wheel' },
    { icon: 'poll', name: 'Live Polls', blurb: 'Instant voting + results on the board' },
    { icon: 'person_search', name: 'Name Picker', blurb: 'Pick volunteers from the pool' },
    { icon: 'timer', name: 'Timed Rounds', blurb: 'Per-round countdowns and rotations' },
];

type Props = {
    plugins: string[];
    onToggle: (key: string, enabled: boolean) => void;
    children?: ReactNode;
};

/**
 * Plugins tab — ONE term, two origins (flexibility-model.md §3):
 *   first_party  in-built, session-toggled modules (shelf + enabled panels)
 *   authored     admin-created / installed plugins (future SDK slot)
 */
export default function PluginsPanel({ plugins, onToggle, children }: Props) {
    return (
        <div className="space-y-6">
            {/* ---- First-party shelf ---- */}
            <section className="glass-card rounded-2xl p-5 shadow-xl">
                <div className="border-b border-white/10 pb-3">
                    <h3 className="font-display text-base font-bold text-on-surface">First-party Plugins</h3>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                        In-built modules for this session only — enable what tonight needs; other sessions stay bare.
                    </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {FIRST_PARTY.map((p) => {
                        const on = plugins.includes(p.key);
                        return (
                            <div
                                key={p.key}
                                className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-all ${
                                    on ? 'border-primary/40 bg-primary/5' : 'border-white/10 bg-surface-container-lowest'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className={`material-symbols-outlined text-[22px] ${on ? 'text-primary' : 'text-on-surface-variant'}`}>
                                        {p.icon}
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-display text-sm font-bold text-on-surface">{p.name}</h4>
                                            <span className="rounded bg-surface-variant px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-on-surface-variant">
                                                {p.category}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{p.blurb}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={on}
                                    aria-label={`toggle ${p.name}`}
                                    onClick={() => onToggle(p.key, !on)}
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

            {/* ---- Authored (future) ---- */}
            <section className="glass-card rounded-2xl border-dashed border-white/15 p-5 shadow-xl">
                <div className="border-b border-white/10 pb-3">
                    <h3 className="font-display text-base font-bold text-on-surface">Authored Plugins</h3>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                        Plugins you create or install — the future SDK slot. Same contract as first-party: hooks on
                        session events, own screens, own data; permission grains come from the core matrix.
                    </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {AUTHORED_TEASERS.map((t) => (
                        <div
                            key={t.name}
                            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-surface-container-lowest/60 p-5 text-center opacity-60"
                        >
                            <span className="material-symbols-outlined text-3xl text-on-surface-variant">{t.icon}</span>
                            <h4 className="font-display text-sm font-bold text-on-surface">{t.name}</h4>
                            <p className="text-xs leading-relaxed text-on-surface-variant">{t.blurb}</p>
                            <span className="mt-1 rounded-full bg-surface-variant px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
                                Authored · Coming soon
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
