const SHIPPED = [
    ['Global chat', 'room + group channels'],
    ['Approval queue', 'screen applicants'],
    ['Proxy mode', 'register absentees'],
    ['Auto-dissolve', 'timed rounds'],
    ['Match me', 'one-tap auto-assign'],
    ['Custom roles', 'delegated powers'],
    ['Kick & ban', 'moderation'],
    ['Group quiz', 'live leaderboard'],
    ['Guest lists', 'invite-only'],
    ['Anonymous mode', 'alias identities'],
    ['PWA', 'installable, offline shell'],
];

/** FR-7.4: the roadmap lives here — everything shipped. */
export default function ComingNext() {
    return (
        <section className="mx-auto mt-12 max-w-6xl border-t border-white/5 px-4 pb-10 pt-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Shipped</h2>
            <div className="mt-3 flex flex-wrap gap-2">
                {SHIPPED.map(([name, note]) => (
                    <span
                        key={name}
                        className="rounded-full border border-emerald-400/20 bg-slate-900 px-3 py-1 text-xs text-slate-400"
                    >
                        {name}
                        <span className="text-slate-600"> · {note}</span>
                    </span>
                ))}
            </div>
        </section>
    );
}
