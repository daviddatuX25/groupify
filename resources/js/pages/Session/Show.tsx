import { useMemo, useState } from 'react';

type Member = { id: number; name: string; role: string };
type Group = {
    id: number;
    name: string;
    leader_id: number | null;
    member_count: number;
    capacity: number;
    open_slots: number;
    field_values: Record<string, string>;
    members: Member[];
};
type Field = { name: string; type: string; required?: boolean; filled_by?: string };
type Me = { id: number; name: string; pooled: boolean } | null;

type SessionProps = {
    code: string;
    status: string;
    presence: number;
    pool: { id: number; name: string }[];
    groups: Group[];
    me: Me;
    config: { rules: Record<string, unknown>; fields: Field[] };
};

export default function Show({ session }: { session: SessionProps }) {
    const [query, setQuery] = useState('');
    const [openOnly, setOpenOnly] = useState(true);
    const [creating, setCreating] = useState(false);
    const [createName, setCreateName] = useState('');
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

    const deviceToken =
        typeof window === 'undefined' ? '' : (window.localStorage.getItem('groupify.device_token') ?? '');

    const mutate = (url: string, data: Record<string, unknown> = {}) => {
        const xsrf = document.cookie
            .split('; ')
            .find((c) => c.startsWith('XSRF-TOKEN='))
            ?.split('=')[1];
        void fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Device-Token': deviceToken,
                ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {}),
            },
            body: JSON.stringify(data),
        }).then((r) => {
            if (r.ok) window.location.reload();
        });
    };

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        return session.groups.filter((g) => {
            if (openOnly && g.open_slots <= 0) return false;
            if (!q) return true;
            const topic = Object.values(g.field_values).join(' ').toLowerCase();
            return g.name.toLowerCase().includes(q) || topic.includes(q);
        });
    }, [session.groups, query, openOnly]);

    const fieldNames = session.groups[0] ? Object.keys(session.groups[0].field_values) : [];
    const canMutate = session.status === 'live' && !(session.config.rules.freeze as boolean);

    const meIn = session.me
        ? session.groups.find((g) => g.members.some((m) => m.id === session.me?.id))
        : undefined;

    const submitCreate = () => {
        mutate(`/s/${session.code}/groups`, { name: createName, field_values: fieldValues });
        setCreating(false);
    };

    return (
        <main className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
            {/* FR-1.6 join-instruction bar */}
            <div className="border-b border-white/10 bg-slate-900/80 px-6 py-2 text-center text-xs text-slate-400 backdrop-blur">
                Joining late? Open{' '}
                <span className="font-mono text-cyan-400">
                    {typeof window !== 'undefined'
                        ? `${window.location.origin}/join/${session.code}`
                        : `/join/${session.code}`}
                </span>{' '}
                and enter the PIN from your host.
            </div>

            <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight">Groupify</h1>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {session.presence} online · {session.pool.length} in the pool
                        </p>
                    </div>
                    <span className="flex items-center gap-2 font-mono text-sm text-cyan-400">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                        {session.code}
                    </span>
                </header>

                {session.me && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
                        {session.me.pooled ? (
                            <p>
                                <span className="font-bold">{session.me.name}</span> — you&rsquo;re in the
                                pool ({session.pool.length}).
                            </p>
                        ) : (
                            <p>
                                <span className="font-bold">{session.me.name}</span> — you&rsquo;re in{' '}
                                <span className="text-emerald-400">{meIn?.name}</span>.
                            </p>
                        )}
                        {canMutate &&
                            session.me.pooled && (
                                <button
                                    type="button"
                                    onClick={() => setCreating((c) => !c)}
                                    className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-bold text-emerald-950 transition active:scale-[0.97]"
                                >
                                    + Create New Group
                                </button>
                            )}
                        {canMutate && meIn && (
                            <button
                                type="button"
                                onClick={() => mutate(`/s/${session.code}/groups/${meIn.id}/leave`)}
                                className="rounded-full border border-white/10 px-5 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
                            >
                                Leave {meIn.name}
                            </button>
                        )}
                    </div>
                )}

                {creating && canMutate && (
                    <form
                        className="mt-4 rounded-2xl border border-cyan-400/30 bg-slate-900 p-5"
                        onSubmit={(e) => {
                            e.preventDefault();
                            submitCreate();
                            setCreating(false);
                        }}
                    >
                        <p className="text-sm font-bold uppercase tracking-wide text-cyan-400">Create a group</p>
                        <input
                            type="text"
                            placeholder="Group name (optional — auto-named)"
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 outline-none focus:border-cyan-400"
                        />
                        {session.config.fields.map((f) => (
                            <input
                                key={f.name}
                                type="text"
                                placeholder={`${f.name}${f.required ? ' *' : ''}`}
                                value={fieldValues[f.name] ?? ''}
                                onChange={(e) => setFieldValues((v) => ({ ...v, [f.name]: e.target.value }))}
                                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 outline-none focus:border-cyan-400"
                            />
                        ))}
                        <button
                            type="submit"
                            className="mt-4 rounded-xl bg-emerald-400 px-5 py-2 text-sm font-bold text-emerald-950"
                        >
                            Create
                        </button>
                    </form>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                        type="text"
                        placeholder="Search groups or topics…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full rounded-full border border-white/10 bg-slate-900 px-4 py-2.5 outline-none focus:border-cyan-400"
                    />
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-400">
                        <input
                            type="checkbox"
                            checked={openOnly}
                            onChange={(e) => setOpenOnly(e.target.checked)}
                            className="rounded border-white/10 bg-slate-900 accent-cyan-400"
                        />
                        Open slots only
                    </label>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {groups.length === 0 && (
                        <p className="col-span-full py-10 text-center text-sm text-slate-500">
                            No groups match. Be the first to create one.
                        </p>
                    )}
                    {groups.map((g) => {
                        const full = g.open_slots <= 0;
                        return (
                            <article
                                key={g.id}
                                className={`relative overflow-hidden rounded-2xl border p-5 transition ${
                                    full
                                        ? 'border-white/10 opacity-70'
                                        : 'border-white/10 hover:border-emerald-400/50'
                                } bg-slate-900`}
                            >
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-40" />
                                <div className="flex items-start justify-between">
                                    <h2 className={`text-lg font-bold ${full ? 'line-through decoration-rose-400' : ''}`}>
                                        {g.name}
                                    </h2>
                                    <div className="flex gap-1">
                                        {Array.from({ length: g.capacity }).map((_, i) => (
                                            <span
                                                key={i}
                                                className={`h-2.5 w-2.5 rounded-full ${
                                                    i < g.member_count
                                                        ? 'bg-cyan-400 shadow-[0_0_6px_#06B6D4]'
                                                        : 'border border-white/20'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {fieldNames.map((f) => (
                                    <p key={f} className="mt-2 text-sm text-slate-400">
                                        <span className="uppercase tracking-wide text-cyan-400">{f}: </span>
                                        {g.field_values[f] ?? <span className="italic">not set</span>}
                                    </p>
                                ))}

                                <ul className="mt-3 space-y-1 text-sm text-slate-300">
                                    {g.members.map((m) => (
                                        <li key={m.id} className="flex items-center gap-2">
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    m.role === 'leader' ? 'bg-emerald-400' : 'bg-slate-600'
                                                }`}
                                            />
                                            {m.name}
                                            {m.role === 'leader' && (
                                                <span className="text-xs text-emerald-400">lead</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-4 flex items-center justify-between">
                                    <p className="text-xs text-slate-500">
                                        {full ? 'FULL' : `${g.open_slots} open`}
                                    </p>
                                    {canMutate && session.me?.pooled && !full && (
                                        <button
                                            type="button"
                                            onClick={() => mutate(`/s/${session.code}/groups/${g.id}/join`)}
                                            className="rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-bold text-emerald-950 transition active:scale-[0.97]"
                                        >
                                            Join
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
