const TEASERS = [
    { icon: 'casino', name: 'Spin the Wheel', blurb: 'Randomize with a group-sized wheel' },
    { icon: 'poll', name: 'Live Polls', blurb: 'Instant voting + results on the board' },
    { icon: 'person_search', name: 'Name Picker', blurb: 'Pick volunteers from the pool' },
    { icon: 'timer', name: 'Timed Rounds', blurb: 'Per-round countdowns and rotations' },
];

/**
 * Plugins shelf (flexibility-model.md §3): FUTURE third-party modules that
 * share the extension slot contract (hooks on session events + own screens +
 * own data) without touching core grouping. Nothing here is implemented —
 * the shelf explains the seam.
 */
export default function PluginsShelf() {
    return (
        <section className="glass-card rounded-2xl border-dashed border-white/15 p-5 shadow-xl">
            <div className="border-b border-white/10 pb-3">
                <h3 className="font-display text-base font-bold text-on-surface">Plugins</h3>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                    Future third-party modules built on the same slot contract as extensions — hooks on session
                    events, own screens, own data; core grouping code never changes.
                </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {TEASERS.map((t) => (
                    <div
                        key={t.name}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-surface-container-lowest/60 p-5 text-center opacity-60"
                    >
                        <span className="material-symbols-outlined text-3xl text-on-surface-variant">{t.icon}</span>
                        <h4 className="font-display text-sm font-bold text-on-surface">{t.name}</h4>
                        <p className="text-xs leading-relaxed text-on-surface-variant">{t.blurb}</p>
                        <span className="mt-1 rounded-full bg-surface-variant px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant">
                            Coming soon
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
