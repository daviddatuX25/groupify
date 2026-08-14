const ROADMAP = [
    ['Chat tiers', 'global + group chat'],
    ['Approval queue', 'screen applicants'],
    ['Proxy mode', 'register others (field trip)'],
    ['Auto-dissolve', 'timed rounds'],
    ['Match me', 'one-tap auto-assign'],
    ['Device binding', '1 device = 1 seat'],
    ['Group quiz', 'per-group live answers'],
    ['Guest lists', 'invite-only sessions'],
];

/** FR-7.4: keep the roadmap visible in the app. */
export default function ComingNext() {
    return (
        <section className="mx-auto mt-12 max-w-6xl border-t border-white/5 px-4 pb-10 pt-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Coming next</h2>
            <div className="mt-3 flex flex-wrap gap-2">
                {ROADMAP.map(([name, note]) => (
                    <span
                        key={name}
                        className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs text-slate-400"
                    >
                        {name}
                        <span className="text-slate-600"> · {note}</span>
                    </span>
                ))}
            </div>
        </section>
    );
}
