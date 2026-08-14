import { echo, useConnectionStatus } from '@laravel/echo-react';
import ComingNext from '@/components/ComingNext';
import ServerStatus from '@/components/ServerStatus';
import { useEffect, useMemo, useRef, useState } from 'react';

type Member = { id: number; name: string; role: string };
type Group = {
    id: number;
    name: string;
    leader_id: number | null;
    pending?: { id: number; name: string }[];
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
    dissolve_at?: string | null;
    presence: number;
    pool: { id: number; name: string }[];
    groups: Group[];
    me: Me;
    config: { rules: Record<string, unknown>; fields: Field[] };
};

const CHANNEL_EVENTS = ['SessionConfigUpdated', 'SessionStateUpdated', 'GroupCreated', 'SessionDeleted'];

export default function Show({ session }: { session: SessionProps }) {
    const [query, setQuery] = useState('');
    const [openOnly, setOpenOnly] = useState(true);
    const [creating, setCreating] = useState(false);
    const [createName, setCreateName] = useState('');
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [board, setBoard] = useState<SessionProps | null>(null);
    const [flash, setFlash] = useState<{ groupId: number; kind: 'joined' | 'left' } | null>(null);
    const [gone, setGone] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [messages, setMessages] = useState<{ id: number; scope: string; author: string; body: string; at: string }[]>([]);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatDraft, setChatDraft] = useState('');
    const [nowTick, setNowTick] = useState(Date.now());
    const prevStatus = useRef<string | null>(null);

    const deviceToken =
        typeof window === 'undefined' ? '' : (window.localStorage.getItem('groupify.device_token') ?? '');

    const data = board ?? session;

    const refetch = () => {
        if (data.config.rules.chat_enabled) {
            fetch(`/s/${data.code}/messages`, { headers: { 'X-Device-Token': deviceToken } })
                .then((r) => (r.ok ? r.json() : null))
                .then((json) => { if (json) setMessages(json.messages); });
        }
        fetch(`/api/sessions/${data.code}/board`, { headers: { 'X-Device-Token': deviceToken } })
            .then((r) => {
                if (r.status === 404) {
                    setGone(true);
                    return null;
                }
                return r.ok ? r.json() : null;
            })
            .then((json) => {
                if (json) setBoard(json as SessionProps);
            });
    };

    // 2-5: live events → refetch the snapshot; membership events flash the card (AD-6)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const channel = echo().channel(`session.${data.code}`);
        CHANNEL_EVENTS.forEach((ev) => channel.listen(ev, refetch));
        channel.listen('MessageCreated', refetch);
        channel.listen('MembershipChanged', (e: { group_id: number; action: string }) => {
            if (e.action === 'joined' || e.action === 'left') {
                const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
                if (!reduced) {
                    setFlash({ groupId: e.group_id, kind: e.action });
                    window.setTimeout(() => setFlash(null), 1200);
                }
            }
            refetch();
        });
        return () => {
            CHANNEL_EVENTS.forEach((ev) => channel.stopListening(ev));
            channel.stopListening('MembershipChanged');
            echo().leaveChannel(`session.${data.code}`);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.code, deviceToken]);

    // Auto-dissolve countdown ticker
    useEffect(() => {
        if (!data.dissolve_at) return;
        const t = window.setInterval(() => setNowTick(Date.now()), 1000);
        return () => window.clearInterval(t);
    }, [data.dissolve_at]);

    // 2-6: reconnect → full snapshot resync (no stale board)
    const status = useConnectionStatus();
    useEffect(() => {
        if (status === 'connected' && prevStatus.current !== 'connected') {
            refetch();
        }
        prevStatus.current = status;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const mutate = (url: string, payload: Record<string, unknown> = {}) => {
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
            body: JSON.stringify(payload),
        })
            .then((r) => {
                if (r.ok) {
                    setActionError(null);
                    refetch();
                    return;
                }
                return r
                    .json()
                    .then((j) => setActionError(j.message ?? 'Something went wrong.'))
                    .catch(() => setActionError(`Request failed (${r.status}).`));
            })
            .catch(() => setActionError('Network error — try again.'));
    };

    if (gone) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
                <div className="text-center">
                    <p className="text-3xl font-bold">This session has ended.</p>
                    <a href="/" className="mt-4 inline-block text-cyan-400 underline">
                        Back home
                    </a>
                </div>
            </main>
        );
    }

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        return data.groups.filter((g) => {
            if (openOnly && g.open_slots <= 0) return false;
            if (!q) return true;
            const topic = Object.values(g.field_values).join(' ').toLowerCase();
            return g.name.toLowerCase().includes(q) || topic.includes(q);
        });
    }, [data.groups, query, openOnly]);

    const fieldNames = data.groups[0] ? Object.keys(data.groups[0].field_values) : [];
    const canMutate = data.status === 'live' && !(data.config.rules.freeze as boolean);

    const meIn = data.me ? data.groups.find((g) => g.members.some((m) => m.id === data.me?.id)) : undefined;

    const submitCreate = () => {
        mutate(`/s/${data.code}/groups`, { name: createName, field_values: fieldValues });
        setCreating(false);
    };

    return (
        <main className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
            {/* FR-1.6 join-instruction bar */}
            <div className="border-b border-white/10 bg-slate-900/80 px-6 py-2 text-center text-xs text-slate-400 backdrop-blur">
                Joining late? Open{' '}
                <span className="font-mono text-cyan-400">
                    {typeof window !== 'undefined'
                        ? `${window.location.origin}/join/${data.code}`
                        : `/join/${data.code}`}
                </span>{' '}
                and enter the PIN from your host.
            </div>
            <ServerStatus />

            {/* Quiz extension (phase-2 M) */}
            {data.quiz && data.quiz.status === 'live' && (
                <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-slate-900 p-5">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-cyan-300">
                            Quiz · Q{data.quiz.current_index + 1}/{data.quiz.total}
                        </h3>
                        {data.me && data.me.id === (data.groups.find((g) => g.members.some((m) => m.id === data.me?.id))?.leader_id ?? -1) ? (
                            data.quiz.my_answer !== null && data.quiz.my_answer !== undefined ? (
                                <span className="text-sm text-emerald-400">Answered ✓</span>
                            ) : (
                                <span className="text-sm text-slate-400">Leader answers for the group</span>
                            )
                        ) : (
                            <span className="text-sm text-slate-400">
                                {data.quiz.my_answer !== null && data.quiz.my_answer !== undefined ? 'Answered ✓' : 'waiting for your leader…'}
                            </span>
                        )}
                    </div>
                    <p className="mt-3 text-lg font-semibold text-slate-100">{data.quiz.question?.q}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {data.quiz.question?.options.map((opt: string, oi: number) => {
                            const answered = data.quiz.my_answer !== null && data.quiz.my_answer !== undefined;
                            const isLeader =
                                data.me && data.me.id === (data.groups.find((g) => g.members.some((m) => m.id === data.me?.id))?.leader_id ?? -1);
                            return (
                                <button
                                    key={oi}
                                    type="button"
                                    disabled={!isLeader || answered}
                                    onClick={() => {
                                        setQuizPick(oi);
                                        const gid = data.groups.find((g) => g.members.some((m) => m.id === data.me?.id))?.id;
                                        if (gid) mutate(`/s/${data.code}/groups/${gid}/quiz/answer`, { question_index: data.quiz.current_index, answer_index: oi });
                                    }}
                                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                                        answered && quizPick === oi
                                            ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300'
                                            : answered
                                              ? 'border-white/10 bg-slate-950 text-slate-500'
                                              : 'border-white/10 bg-slate-950 text-slate-200 hover:border-cyan-400/50'
                                    }`}
                                >
                                    {String.fromCharCode(65 + oi)}. {opt}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 border-t border-white/10 pt-3">
                        <span className="text-xs uppercase tracking-wide text-slate-500">Leaderboard</span>
                        <ol className="mt-1 space-y-1 text-sm">
                            {data.quiz.leaderboard?.map((l: { name: string; points: number }, i: number) => (
                                <li key={l.name} className="flex items-center justify-between text-slate-300">
                                    <span>
                                        {i + 1}. {l.name}
                                    </span>
                                    <span className="text-cyan-300">{l.points} pts</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}

            <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight">Groupify</h1>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {data.presence} online · {data.pool.length} in the pool
                        </p>
                    </div>
                    <span className="flex items-center gap-3">
                        {data.dissolve_at && (
                            <span className="font-mono text-xs text-rose-300">
                                groups dissolve in {Math.max(0, Math.ceil((new Date(data.dissolve_at).getTime() - nowTick) / 1000))}s
                            </span>
                        )}
                        <span className="flex items-center gap-2 font-mono text-sm text-cyan-400">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                            {data.code}
                        </span>
                    </span>
                </header>

                {data.me && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
                        {data.me.pooled ? (
                            <p>
                                <span className="font-bold">{data.me.name}</span> — you&rsquo;re in the
                                pool ({data.pool.length}).
                            </p>
                        ) : (
                            <p>
                                <span className="font-bold">{data.me.name}</span> — you&rsquo;re in{' '}
                                <span className="text-emerald-400">{meIn?.name}</span>.
                            </p>
                        )}
                        {canMutate &&
                            data.me.pooled && (
                                <span className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => mutate(`/s/${data.code}/match-me`)}
                                        className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-bold text-deep-ink transition active:scale-[0.97]"
                                    >
                                        ⚡ Match me
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCreating((c) => !c)}
                                        className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-bold text-emerald-950 transition active:scale-[0.97]"
                                    >
                                        + Create New Group
                                    </button>
                                </span>
                            )}
                        {canMutate && meIn && (
                            <button
                                type="button"
                                onClick={() => mutate(`/s/${data.code}/groups/${meIn.id}/leave`)}
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
                        {data.config.fields.map((f) => (
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
                        const isFlashing = flash?.groupId === g.id;
                        const flashStyle =
                            isFlashing && flash?.kind === 'joined'
                                ? 'border-emerald-400 shadow-[0_0_20px_rgba(78,222,163,0.35)]'
                                : isFlashing && flash?.kind === 'left'
                                  ? 'border-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                                  : 'border-white/10';
                        return (
                            <article
                                key={g.id}
                                className={`relative overflow-hidden rounded-2xl border p-5 transition ${
                                    full ? 'opacity-70' : 'hover:border-emerald-400/50'
                                } ${flashStyle} bg-slate-900`}
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

                                {data.me?.id === g.leader_id &&
                                    g.pending?.length ? (
                                    <div className="mt-3 rounded-xl border border-cyan-400/20 bg-slate-950 p-2">
                                        <p className="text-[10px] uppercase tracking-widest text-cyan-400">
                                            Pending requests
                                        </p>
                                        {g.pending?.map((p) => (
                                            <div key={p.id} className="mt-1 flex items-center justify-between gap-2 text-xs">
                                                <span className="truncate">{p.name}</span>
                                                <span className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            mutate(`/s/${data.code}/groups/${g.id}/requests/${p.id}/approve`)
                                                        }
                                                        className="rounded bg-emerald-400/15 px-2 py-0.5 text-emerald-300"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            mutate(`/s/${data.code}/groups/${g.id}/requests/${p.id}/reject`)
                                                        }
                                                        className="rounded bg-rose-400/15 px-2 py-0.5 text-rose-300"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

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
                                            {canMutate &&
                                                data.me?.id === g.leader_id &&
                                                m.role !== 'leader' &&
                                                m.id !== data.me.id && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            mutate(`/s/${data.code}/groups/${g.id}/members/${m.id}/kick`)
                                                        }
                                                        className="ml-auto rounded bg-rose-400/15 px-1.5 py-0.5 text-[10px] text-rose-300"
                                                    >
                                                        kick
                                                    </button>
                                                )}
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-4 flex items-center justify-between">
                                    <p className="text-xs text-slate-500">
                                        {full ? 'FULL' : `${g.open_slots} open`}
                                    </p>
                                    {canMutate && data.me?.pooled && !full && (
                                        <button
                                            type="button"
                                            onClick={() => mutate(`/s/${data.code}/groups/${g.id}/join`)}
                                            className="rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-bold text-emerald-950 transition active:scale-[0.97]"
                                        >
                                            {data.config.rules.join_mode === 'approval' ? 'Request to join' : 'Join'}
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
            {data.config.rules.chat_enabled && (
                <section className="mx-auto mt-8 w-full max-w-6xl px-4">
                    <button
                        type="button"
                        onClick={() => setChatOpen((o) => !o)}
                        className="rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-300"
                    >
                        💬 Chat {chatOpen ? '▾' : '▸'}
                    </button>
                    {chatOpen && (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
                            <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
                                {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
                                {messages.map((m) => (
                                    <div key={m.id} className="text-sm">
                                        <span className="font-semibold text-cyan-300">{m.author}</span>{' '}
                                        <span className="text-slate-500">{new Date(m.at).toLocaleTimeString()}</span>
                                        <p className="text-slate-200">{m.body}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Post to the room…"
                                    value={chatDraft}
                                    onChange={(e) => setChatDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && chatDraft.trim()) {
                                            const body = chatDraft;
                                            setChatDraft('');
                                            void fetch(`/s/${data.code}/messages`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    Accept: 'application/json',
                                                    'X-Device-Token': deviceToken,
                                                    'X-XSRF-TOKEN': decodeURIComponent(
                                                        document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                                    ),
                                                },
                                                body: JSON.stringify({ scope: 'global', body }),
                                            }).then((r) => { if (r.ok) refetch(); });
                                        }
                                    }}
                                    className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                                />
                            </div>
                            {meIn && (
                                <div className="mt-3 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Message your group…"
                                        value={chatDraft}
                                        onChange={(e) => setChatDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && chatDraft.trim()) {
                                                const body = chatDraft;
                                                setChatDraft('');
                                                void fetch(`/s/${data.code}/messages`, {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        Accept: 'application/json',
                                                        'X-Device-Token': deviceToken,
                                                        'X-XSRF-TOKEN': decodeURIComponent(
                                                            document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                                        ),
                                                    },
                                                    body: JSON.stringify({ scope: 'group', group_id: meIn.id, body }),
                                                }).then((r) => { if (r.ok) refetch(); });
                                            }
                                        }}
                                        className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}
            <ComingNext />
        </main>
    );
}
