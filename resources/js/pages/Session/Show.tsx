import { echo, useConnectionStatus } from '@laravel/echo-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ComingNext from '@/components/ComingNext';
import GroupCreateDialog from '@/components/GroupCreateDialog';
import { Logo } from '@/components/Logo';
import ServerStatus from '@/components/ServerStatus';
import { configureGroupifyEcho } from '@/lib/echo';

type Member = { id: number; name: string; role: string; custom_role?: string | null };
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

type QuizState = {
    status: string;
    current_index: number;
    total: number;
    question?: { q: string; options: string[] } | null;
    my_answer?: number | null;
    leaderboard?: { name: string; points: number }[];
};
type SessionProps = {
    code: string;
    status: string;
    dissolve_at?: string | null;
    presence: number;
    pool: { id: number; name: string }[];
    groups: Group[];
    me: Me;
    config: { rules: Record<string, unknown>; fields: Field[]; plugins?: string[] };
    quiz?: QuizState | null;
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
    const [messages, setMessages] = useState<{ id: number; scope: string; group_id?: number | null; author: string; body: string; at: string }[]>([]);
    const [chatOpen, setChatOpen] = useState(false);
    const [globalDraft, setGlobalDraft] = useState('');
    const [groupDraft, setGroupDraft] = useState('');
    const [detailGroupId, setDetailGroupId] = useState<number | null>(null);
    const [quizPick, setQuizPick] = useState<number | null>(null);
    const [nowTick, setNowTick] = useState(Date.now());
    const [liveCount, setLiveCount] = useState<number | null>(null);
    const prevStatus = useRef<string | null>(null);

    const deviceToken =
        typeof window === 'undefined' ? '' : (window.localStorage.getItem('groupify.device_token') ?? '');

    const data = board ?? session;

    const refetchRef = useRef<() => void>(() => {});
    const seqRef = useRef(0);

    const refetch = () => {
        if (data.config.rules.chat_enabled) {
            fetch(`/s/${data.code}/messages`, { headers: { 'X-Device-Token': deviceToken } })
                .then((r) => (r.ok ? r.json() : null))
                .then((json) => {
 if (json) {
setMessages(json.messages);
} 
});
        }

        const seq = ++seqRef.current;
        fetch(`/api/sessions/${data.code}/board`, { headers: { 'X-Device-Token': deviceToken } })
            .then((r) => {
                if (r.status === 404) {
                    setGone(true);

                    return null;
                }

                return r.ok ? r.json() : null;
            })
            .then((json) => {
                if (json && seq === seqRef.current) {
setBoard(json as SessionProps);
}
            });
    };
    refetchRef.current = refetch;

    // 2-5: live events → refetch the snapshot; membership events flash the card (AD-6)
    useEffect(() => {
        if (typeof window === 'undefined') {
return;
}

        configureGroupifyEcho({ deviceToken });
        const channel = echo().channel(`session.${data.code}`);
        CHANNEL_EVENTS.forEach((ev) => channel.listen(ev, () => refetchRef.current()));


        // FR-3.5: live presence — the presence channel's member count is the
        // real online population (vs the seat count in data.presence).
        const presence = echo().join(`session.${data.code}`);
        presence.here((members: unknown[]) => setLiveCount(members.length));
        presence.joining(() => setLiveCount((c) => (c === null ? c : c + 1)));
        presence.leaving((member: { name: string }) => {
            setLiveCount((c) => (c === null ? c : Math.max(0, c - 1)));
            void member;
        });
        channel.listen('MessageCreated', () => refetchRef.current());
        channel.listen('MembershipChanged', (e: { group_id: number; action: string }) => {
            if (e.action === 'joined' || e.action === 'left') {
                const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

                if (!reduced) {
                    setFlash({ groupId: e.group_id, kind: e.action });
                    window.setTimeout(() => setFlash(null), 1200);
                }
            }

            refetchRef.current();
        });

        return () => {
            CHANNEL_EVENTS.forEach((ev) => channel.stopListening(ev));
            channel.stopListening('MembershipChanged');
            echo().leaveChannel(`session.${data.code}`);
        };
         
    }, [data.code, deviceToken]);

    // F6: never leave the device token in the address bar (history/referrer leak)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.search.includes('device_token')) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // Auto-dissolve countdown ticker
    useEffect(() => {
        if (!data.dissolve_at) {
return;
}

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

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();

        return data.groups.filter((g) => {
            if (openOnly && g.open_slots <= 0) {
return false;
}

            if (!q) {
return true;
}

            const topic = Object.values(g.field_values).join(' ').toLowerCase();

            return g.name.toLowerCase().includes(q) || topic.includes(q);
        });
    }, [data.groups, query, openOnly]);

    if (gone) {
        return (
            <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 text-on-surface">
                <div className="glow-tr" />
                <div className="glow-bl" />
                <div className="glass-card relative z-10 max-w-md rounded-2xl p-8 text-center shadow-2xl backdrop-blur-xl">
                    <span className="material-symbols-outlined text-5xl text-secondary">meeting_room</span>
                    <p className="font-display mt-4 text-2xl font-bold text-on-surface">This session has ended.</p>
                    <p className="mt-2 text-sm text-on-surface-variant">The host has closed or dissolved this room.</p>
                    <a
                        href="/"
                        className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-primary-container px-6 py-2.5 font-display text-sm font-bold text-on-primary-container shadow-[0_0_15px_rgba(78,222,61,0.3)] transition-all hover:brightness-110"
                    >
                        <span>Back Home</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                </div>
            </main>
        );
    }

    const fieldNames = data.groups[0] ? Object.keys(data.groups[0].field_values) : [];
    const canMutate = data.status === 'live' && !(data.config.rules.freeze as boolean);

    const meIn = data.me ? data.groups.find((g) => g.members.some((m) => m.id === data.me?.id)) : undefined;
    const detailGroup = detailGroupId === null ? null : data.groups.find((g) => g.id === detailGroupId) ?? null;
    const roomMessages = messages.filter((message) => message.scope === 'global' || message.scope === 'announcement');
    const detailGroupMessages = detailGroup
        ? messages.filter((message) => message.scope === 'group' && message.group_id === detailGroup.id)
        : [];
    const detailMember = detailGroup && data.me ? detailGroup.members.some((member) => member.id === data.me?.id) : false;
    const chatEnabled = Boolean(data.config.rules.chat_enabled);
    const canPostToDetailGroup = Boolean(
        chatEnabled
        && detailGroup
        && detailMember
        && (data.config.rules.group_chat_mode !== 'leader' || detailGroup.leader_id === data.me?.id),
    );
    const globalChatMode = String(data.config.rules.global_chat_mode ?? 'open');
    const closeCreate = () => {
        setCreating(false);
        setCreateName('');
        setFieldValues({});
    };

    const submitCreate = () => {
        mutate(`/s/${data.code}/groups`, { name: createName, field_values: fieldValues });
        closeCreate();
    };

    return (
        <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#0b1326] font-sans text-on-surface antialiased selection:bg-primary/30">
            {/* Atmospheric Background Gradients */}
            <div className="ambient-glow-cyan pointer-events-none fixed inset-0 z-0" />
            <div className="ambient-glow-pink pointer-events-none fixed inset-0 z-0" />

            {/* Top Late-Join Banner */}
            <div className="relative z-10 border-b border-secondary/20 bg-secondary-container/10 px-4 py-2 text-center font-mono text-xs tracking-wider text-secondary backdrop-blur-md sm:px-6">
                <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        info
                    </span>
                    <span>
                        Joining late? Open{' '}
                        <span className="font-bold text-on-surface underline">
                            {typeof window !== 'undefined'
                                ? `${window.location.origin}/join/${data.code}`
                                : `/join/${data.code}`}
                        </span>{' '}
                        {data.config.rules.join_mode === 'open' ? 'and join directly.' : 'and enter the PIN.'}
                    </span>
                </div>
            </div>

            <ServerStatus />

            {/* Action error banner */}
            {actionError && (
                <div className="relative z-10 mx-auto mt-4 w-full max-w-6xl px-4">
                    <div className="flex items-center justify-between rounded-xl border border-error/40 bg-error-container/20 px-4 py-2.5 text-xs text-error backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            <span>{actionError}</span>
                        </div>
                        <button type="button" onClick={() => setActionError(null)} className="text-on-surface-variant hover:text-on-surface">
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 pb-28">
                {/* Header: Identity, Live Pulse, Room Code & PIN */}
                <header className="flex flex-wrap items-center justify-between gap-4 pb-4">
                    <div className="flex items-center gap-3">
                        <Logo className="h-8 w-8 text-primary drop-shadow-[0_0_15px_rgba(109,252,87,0.3)]" />
                        <div>
                            <h1 className="font-display text-xl font-extrabold tracking-tight text-on-surface sm:text-2xl">
                                Groupify
                            </h1>
                            <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-on-surface-variant">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_6px_#6dfc57]" />
                                <span>{(liveCount ?? data.presence)} online</span>
                                <span>·</span>
                                <span>{data.pool.length} in Pool</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {data.dissolve_at && (
                            <div className="flex items-center gap-1.5 rounded-full border border-tertiary-container/30 bg-tertiary-container/10 px-3 py-1 font-mono text-xs text-[#ec4899]">
                                <span className="material-symbols-outlined text-[14px]">timer</span>
                                <span>
                                    {Math.max(0, Math.ceil((new Date(data.dissolve_at).getTime() - nowTick) / 1000))}s left
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-container-high/80 px-3.5 py-1.5 backdrop-blur-md">
                            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                                Session
                            </span>
                            <span className="font-mono text-sm font-bold text-secondary">
                                {data.code}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Profile Module: Glass Card */}
                {data.me && (
                    <section className="glass-panel group relative mt-4 overflow-hidden rounded-2xl p-5 shadow-xl transition-all">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-surface-container-high font-display text-lg font-bold text-primary shadow-inner">
                                    {data.me.name.charAt(0).toUpperCase()}
                                    <div className="absolute -right-0.5 -bottom-0.5 rounded-full border border-white/10 bg-surface-container p-0.5">
                                        <span className="material-symbols-outlined text-[13px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                                            check_circle
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="font-display text-base font-bold text-on-surface sm:text-lg">
                                        {data.me.name} <span className="text-sm font-normal text-on-surface-variant">(You)</span>
                                    </h2>
                                    <p className="mt-0.5 font-mono text-xs text-on-surface-variant">
                                        {data.me.pooled ? (
                                            <span>you&rsquo;re in the pool ({data.pool.length}).</span>
                                        ) : (
                                            <span>you&rsquo;re in <span className="font-semibold text-primary">{meIn?.name}</span>.</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                {canMutate && data.me.pooled && (
                                    <>
                                        {(data.config.plugins ?? []).includes('match_me') && (
                                        <button
                                            type="button"
                                            onClick={() => mutate(`/s/${data.code}/match-me`)}
                                            className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2.5 font-display text-xs font-bold text-on-secondary shadow-[0_0_15px_rgba(76,215,246,0.3)] transition-all duration-200 hover:brightness-110 active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">bolt</span>
                                            <span>Match me</span>
                                        </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setCreating((c) => !c)}
                                            className="flex items-center gap-1.5 rounded-xl bg-primary-container px-4 py-2.5 font-display text-xs font-bold text-on-primary-container shadow-[0_0_20px_rgba(78,222,61,0.25)] transition-all duration-200 hover:brightness-110 active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                            <span>CREATE NEW GROUP</span>
                                        </button>
                                    </>
                                )}
                                {canMutate && meIn && (
                                    <button
                                        type="button"
                                        onClick={() => mutate(`/s/${data.code}/groups/${meIn.id}/leave`)}
                                        className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-surface-variant/40 px-4 py-2 font-sans text-xs font-bold text-on-surface-variant transition-all hover:bg-surface-variant hover:text-on-surface"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">logout</span>
                                        <span>Leave {meIn.name}</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {creating && canMutate && (
                            <GroupCreateDialog
                                title="Create a new team"
                                description="Choose a name and add any session fields before you join."
                                name={createName}
                                onNameChange={setCreateName}
                                fields={data.config.fields}
                                fieldValues={fieldValues}
                                onFieldChange={(name, value) => setFieldValues((values) => ({ ...values, [name]: value }))}
                                onClose={closeCreate}
                                onSubmit={submitCreate}
                                submitLabel="Create"
                            />
                        )}
                    </section>
                )}

                {/* Quiz Extension Card */}
                {data.quiz && data.quiz.status === 'live' && (
                    <div className="glass-panel relative mt-6 overflow-hidden rounded-2xl border-secondary/30 p-5 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-secondary text-[20px]">quiz</span>
                                <h3 className="font-display text-base font-bold text-secondary">
                                    Live Quiz · Question {data.quiz.current_index + 1} of {data.quiz.total}
                                </h3>
                            </div>
                            {data.me && data.me.id === (data.groups.find((g) => g.members.some((m) => m.id === data.me?.id))?.leader_id ?? -1) ? (
                                data.quiz.my_answer !== null && data.quiz.my_answer !== undefined ? (
                                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary">
                                        <span className="material-symbols-outlined text-[14px]">check</span> Answered
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-secondary/10 px-3 py-1 font-mono text-xs font-bold text-secondary">
                                        Leader answers for team
                                    </span>
                                )
                            ) : (
                                <span className="font-mono text-xs text-on-surface-variant">
                                    {data.quiz.my_answer !== null && data.quiz.my_answer !== undefined
                                        ? '✓ Team answered'
                                        : 'Waiting for leader…'}
                                </span>
                            )}
                        </div>

                        <p className="mt-4 font-display text-lg font-semibold text-on-surface">
                            {data.quiz.question?.q}
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {data.quiz.question?.options.map((opt: string, oi: number) => {
                                const answered = data.quiz!.my_answer !== null && data.quiz!.my_answer !== undefined;
                                const isLeader =
                                    data.me && data.me.id === (data.groups.find((g) => g.members.some((m) => m.id === data.me?.id))?.leader_id ?? -1);
                                const isPick = quizPick === oi || data.quiz?.my_answer === oi;

                                return (
                                    <button
                                        key={oi}
                                        type="button"
                                        disabled={data.quiz?.status !== 'live' || !isLeader || answered}
                                        onClick={() => {
                                            setQuizPick(oi);
                                            const gid = data.groups.find((g) => g.members.some((m) => m.id === data.me?.id))?.id;

                                            if (gid) {
                                            mutate(`/s/${data.code}/groups/${gid}/quiz/answer`, { question_index: data.quiz!.current_index, answer_index: oi });
}
                                        }}
                                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                                            isPick
                                                ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(109,252,87,0.2)]'
                                                : answered
                                                  ? 'border-white/5 bg-[#060e20]/60 text-on-surface-variant/40'
                                                  : 'border-white/10 bg-[#060e20] text-on-surface hover:border-secondary/50 hover:bg-surface-variant/40'
                                        }`}
                                    >
                                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                                            isPick ? 'bg-primary text-on-primary-container' : 'bg-surface-variant text-on-surface-variant'
                                        }`}>
                                            {String.fromCharCode(65 + oi)}.
                                        </span>
                                        <span className="text-sm font-medium">{opt}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {data.quiz.leaderboard && data.quiz.leaderboard.length > 0 && (
                            <div className="mt-5 border-t border-white/10 pt-3.5">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                    Live Leaderboard
                                </span>
                                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {data.quiz.leaderboard.slice(0, 4).map((l: { name: string; points: number }, i: number) => (
                                        <div key={l.name} className="flex items-center justify-between rounded-lg border border-white/5 bg-surface-container/60 px-3 py-1.5 text-xs">
                                            <span className="truncate font-medium text-on-surface">{i + 1}. {l.name}</span>
                                            <span className="font-mono font-bold text-secondary">{l.points} pts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Search & Filter Controls */}
                <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                            search
                        </span>
                        <input
                            type="search"
                            aria-label="Search teams and topics"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-surface-container-high/80 py-2.5 pl-10 pr-4 font-sans text-sm text-on-surface focus:border-primary focus:shadow-[0_0_12px_rgba(78,222,61,0.2)] focus:outline-none transition-all"
                        />
                    </div>
                    <label className="group flex shrink-0 cursor-pointer items-center gap-2 select-none">
                        <div className="relative flex h-5 w-5 items-center justify-center rounded-md border border-white/20 bg-surface-container transition-colors group-hover:border-primary/50">
                            <input
                                type="checkbox"
                                checked={openOnly}
                                onChange={(e) => setOpenOnly(e.target.checked)}
                                className="peer sr-only"
                            />
                            <span className="material-symbols-outlined absolute text-[16px] text-primary opacity-0 transition-opacity peer-checked:opacity-100" style={{ fontVariationSettings: "'FILL' 1" }}>
                                check
                            </span>
                        </div>
                        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface-variant transition-colors group-hover:text-on-surface">
                            Open Only
                        </span>
                    </label>
                </section>

                {/* Group Grid Cards */}
                <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {groups.length === 0 && (
                        <div className="glass-panel col-span-full rounded-2xl border-dashed border-white/15 p-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">groups</span>
                            <p className="mt-2 font-display text-base font-bold text-on-surface">No groups match your search.</p>
                            <p className="mt-1 text-xs text-on-surface-variant">Be the first to create one or adjust your filters.</p>
                        </div>
                    )}

                    {groups.map((g) => {
                        const full = g.open_slots <= 0;
                        const isFlashing = flash?.groupId === g.id;
                        const flashStyle =
                            isFlashing && flash?.kind === 'joined'
                                ? 'border-primary shadow-[0_0_20px_rgba(109,252,87,0.4)]'
                                : isFlashing && flash?.kind === 'left'
                                  ? 'border-error shadow-[0_0_20px_rgba(255,180,171,0.3)]'
                                  : 'border-white/10';

                        return (
                            <article
                                key={g.id}
                                className={`glass-panel group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 shadow-lg transition-all duration-300 ${
                                    full ? 'border-[#ec4899]/40 bg-[#ec4899]/5' : 'hover:border-primary/40'
                                } ${flashStyle}`}
                            >
                                {/* Top Gradient Accent */}
                                <div className={`absolute inset-x-0 top-0 h-1 transition-opacity ${
                                    full
                                        ? 'bg-[#ec4899]'
                                        : 'bg-gradient-to-r from-primary to-secondary opacity-50 group-hover:opacity-100'
                                }`} />

                                <div>
                                    {/* Card Header: Group Name & Slot Dots */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <h2 className={`font-display text-lg font-bold text-on-surface ${
                                                full ? 'line-through decoration-white/30 text-on-surface-variant' : ''
                                            }`}>
                                                {g.name}
                                            </h2>
                                            {full && (
                                                <span className="rounded bg-[#ec4899] px-2 py-0.5 font-mono text-[9px] font-bold tracking-widest text-white uppercase shadow-[0_0_8px_rgba(236,72,153,0.4)]">
                                                    FULL
                                                </span>
                                            )}
                                        </div>

                                        {/* Capacity Slot Dots */}
                                        <div className="flex shrink-0 items-center gap-1.5 pt-1" title={`${g.member_count}/${g.capacity} filled`}>
                                            {Array.from({ length: g.capacity }).map((_, i) => (
                                                <span
                                                    key={i}
                                                    className={
                                                        full
                                                            ? 'slot-dot slot-dot-full'
                                                            : i < g.member_count
                                                              ? 'slot-dot slot-dot-filled'
                                                              : 'slot-dot slot-dot-empty'
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Topic / Fields */}
                                    {fieldNames.map((f) => (
                                        <p key={f} className="mt-1 font-mono text-xs uppercase tracking-wide text-secondary">
                                            {f}: {g.field_values[f] ?? <span className="italic opacity-50">not set</span>}
                                        </p>
                                    ))}

                                    {/* Leader's Pending Requests Panel */}
                                    {data.me?.id === g.leader_id && g.pending && g.pending.length > 0 && (
                                        <div className="mt-3.5 rounded-xl border border-secondary/30 bg-[#060e20] p-2.5">
                                            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                                                Pending Join Requests
                                            </p>
                                            <div className="mt-2 space-y-1.5">
                                                {g.pending.map((p) => (
                                                    <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                                                        <span className="truncate font-medium text-on-surface">{p.name}</span>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                aria-label={`approve ${p.name}`}
                                                                onClick={() =>
                                                                    mutate(`/s/${data.code}/groups/${g.id}/requests/${p.id}/approve`)
                                                                }
                                                                className="rounded-lg bg-primary-container px-2 py-0.5 text-xs font-bold text-on-primary-container transition-all hover:brightness-110"
                                                            >
                                                                ✓
                                                            </button>
                                                            <button
                                                                type="button"
                                                                aria-label={`reject ${p.name}`}
                                                                onClick={() =>
                                                                    mutate(`/s/${data.code}/groups/${g.id}/requests/${p.id}/reject`)
                                                                }
                                                                className="rounded-lg bg-error-container/40 px-2 py-0.5 text-xs font-bold text-error transition-all hover:bg-error-container"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Members List */}
                                    <ul className="mt-4 space-y-1.5 text-xs text-on-surface">
                                        {g.members.map((m) => (
                                            <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-variant/30">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                                        m.role === 'leader' ? 'bg-primary shadow-[0_0_6px_#6dfc57]' : 'bg-on-surface-variant/40'
                                                    }`} />
                                                    <span className={m.role === 'leader' ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}>
                                                        {m.name}
                                                    </span>
                                                    {m.role === 'leader' && (
                                                        <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-mono font-bold text-primary">
                                                            lead
                                                        </span>
                                                    )}
                                                </div>

                                                {canMutate &&
                                                    data.me?.id === g.leader_id &&
                                                    m.role !== 'leader' &&
                                                    m.id !== data.me.id && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                mutate(`/s/${data.code}/groups/${g.id}/members/${m.id}/kick`)
                                                            }
                                                            className="rounded bg-error-container/30 px-1.5 py-0.5 text-[10px] font-mono text-error hover:bg-error-container/50"
                                                        >
                                                            kick
                                                        </button>
                                                    )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Card Footer: Slot Count, Detail, Join */}
                                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setDetailGroupId(g.id)}
                                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-container/40 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-secondary transition-all hover:border-secondary/50 hover:bg-secondary/10"
                                    >
                                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                                        Open team
                                    </button>
                                    <p className="font-mono text-xs text-on-surface-variant">
                                        {full ? (
                                            <span className="font-bold text-[#ec4899]">FULL</span>
                                        ) : (
                                            <span>{g.open_slots} open</span>
                                        )}
                                    </p>

                                    {canMutate && data.me?.pooled && !full && (
                                        <button
                                            type="button"
                                            onClick={() => mutate(`/s/${data.code}/groups/${g.id}/join`)}
                                            className="rounded-xl bg-surface-bright px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-primary border border-white/15 shadow-[0_0_10px_rgba(109,252,87,0.15)] transition-all hover:bg-surface-variant active:scale-95"
                                        >
                                            {data.config.rules.join_mode === 'approval' ? 'Request to join' : 'Join'}
                                        </button>
                                    )}

                                    {full && (
                                        <button
                                            disabled
                                            className="flex items-center gap-1 rounded-xl border border-white/5 bg-surface-container/50 px-3 py-1 font-mono text-xs uppercase tracking-wider text-on-surface-variant/40 cursor-not-allowed"
                                        >
                                            <span className="material-symbols-outlined text-[13px]">lock</span>
                                            <span>Closed</span>
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </section>
                {detailGroup && (
                    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${detailGroup.name} group details`}>
                        <button type="button" aria-label="Close group details" onClick={() => setDetailGroupId(null)} className="absolute inset-0 cursor-default" />
                        <aside className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-white/10 bg-[#0b1326] p-5 shadow-2xl sm:p-7">
                            <header className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                                <div>
                                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">Team detail</p>
                                    <h2 className="mt-1 font-display text-2xl font-extrabold text-on-surface">{detailGroup.name}</h2>
                                    <p className="mt-1 font-mono text-xs text-on-surface-variant">{detailGroup.member_count}/{detailGroup.capacity} members · {detailGroup.open_slots} open</p>
                                </div>
                                <button type="button" aria-label="Close group details" onClick={() => setDetailGroupId(null)} className="rounded-xl border border-white/10 p-2 text-on-surface-variant hover:text-on-surface">
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </header>

                            <div className="mt-5 flex flex-wrap gap-2">
                                {Object.entries(detailGroup.field_values).map(([key, value]) => (
                                    <span key={key} className="rounded-lg border border-secondary/25 bg-secondary/10 px-3 py-1.5 font-mono text-xs text-secondary">{key}: <strong>{value || 'not set'}</strong></span>
                                ))}
                            </div>

                            <section className="mt-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant">Members</h3>
                                    <span className="font-mono text-xs text-primary">{detailGroup.member_count}/{detailGroup.capacity}</span>
                                </div>
                                <ul className="mt-3 space-y-2">
                                    {detailGroup.members.map((member) => (
                                        <li key={member.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-surface-container-low p-3">
                                            <span className="flex items-center gap-2 text-sm text-on-surface">
                                                <span className={`h-2 w-2 rounded-full ${member.role === 'leader' ? 'bg-primary shadow-[0_0_7px_#6dfc57]' : 'bg-on-surface-variant/40'}`} />
                                                {member.name}
                                                {member.role === 'leader' && <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary">leader</span>}
                                            </span>
                                            {canMutate && data.me?.id === detailGroup.leader_id && member.role !== 'leader' && member.id !== data.me?.id && (
                                                <button type="button" onClick={() => mutate(`/s/${data.code}/groups/${detailGroup.id}/members/${member.id}/kick`)} className="rounded-lg bg-error-container/30 px-2 py-1 font-mono text-[10px] text-error hover:bg-error-container/50">kick</button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            <section className="mt-6 flex flex-1 flex-col">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant">Group chat</h3>
                                        <p className="mt-1 text-[10px] text-on-surface-variant/65">Private to {detailGroup.name}; room chat is separate.</p>
                                    {!chatEnabled && <span className="font-mono text-[10px] text-on-surface-variant/60">Disabled</span>}
                                    {chatEnabled && !detailMember && <span className="font-mono text-[10px] text-on-surface-variant/60">Members only</span>}
                                    {chatEnabled && detailMember && !canPostToDetailGroup && <span className="font-mono text-[10px] text-on-surface-variant/60">Leader-only</span>}
                                    </div>
                                </div>
                                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-[#060e20] p-3">
                                    {!chatEnabled ? (
                                        <p className="py-8 text-center text-xs text-on-surface-variant/60">Ask the host to enable group messaging.</p>
                                    ) : detailGroupMessages.length === 0 ? (
                                        <p className="py-8 text-center text-xs text-on-surface-variant/60">No messages in this group yet.</p>
                                    ) : detailGroupMessages.map((message) => (
                                        <div key={message.id} className="rounded-lg bg-surface-container-low p-2.5 text-xs">
                                            <div className="flex justify-between gap-2"><strong className="text-primary">{message.author}</strong><span className="font-mono text-on-surface-variant/50">{new Date(message.at).toLocaleTimeString()}</span></div>
                                            <p className="mt-1 text-on-surface">{message.body}</p>
                                        </div>
                                    ))}
                                </div>
                                {canPostToDetailGroup && (
                                    <div className="mt-3 flex gap-2">
                                        <input type="text" aria-label={`Message ${detailGroup.name}`} value={groupDraft} onChange={(event) => setGroupDraft(event.target.value)} onKeyDown={(event) => {
 if (event.key === 'Enter' && groupDraft.trim()) {
 const body = groupDraft.trim(); setGroupDraft(''); mutate(`/s/${data.code}/messages`, { scope: 'group', group_id: detailGroup.id, body }); 
} 
}} className="flex-1 rounded-xl border border-white/10 bg-[#060e20] px-3 py-2.5 text-xs text-on-surface focus:border-primary focus:outline-none" />
                                        <button type="button" onClick={() => {
 const body = groupDraft.trim();

 if (!body) {
return;
}

 setGroupDraft(''); mutate(`/s/${data.code}/messages`, { scope: 'group', group_id: detailGroup.id, body }); 
}} className="rounded-xl bg-primary-container px-3 text-on-primary-container hover:brightness-110" aria-label="Send group message"><span className="material-symbols-outlined text-[17px]">send</span></button>
                                    </div>
                                )}
                            </section>
                        </aside>
                    </div>
                )}

                {/* Room messaging — enabled by default for new sessions */}


                {/* Chat Drawer */}
                {chatEnabled && (
                    <section className="mt-8">
                        <button
                            type="button"
                            onClick={() => setChatOpen((o) => !o)}
                            className="glass-panel flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-on-surface transition-all hover:border-primary/40"
                        >
                            <span className="material-symbols-outlined text-secondary text-[18px]">forum</span>
                            <span>Chat</span>
                            <span className="font-mono text-xs text-on-surface-variant">{chatOpen ? '▾' : '▸'}</span>
                        </button>

                        {chatOpen && (
                            <div className="glass-panel mt-3 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
                                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                                    <div>
                                        <h2 className="font-display text-base font-bold text-on-surface">Room chat</h2>
                                        <p className="mt-1 text-[11px] text-on-surface-variant">Shared with everyone in this session.</p>
                                    </div>
                                    <span className="rounded-full bg-secondary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-secondary">
                                        {globalChatMode === 'moderated' ? 'Moderated' : globalChatMode === 'muted' ? 'Read only' : 'Open'}
                                    </span>
                                </div>
                                <div className="mt-4 max-h-64 space-y-2.5 overflow-y-auto pr-2">
                                    {roomMessages.length === 0 && (
                                        <p className="py-6 text-center font-mono text-xs text-on-surface-variant/50">No room messages yet. Start the conversation.</p>
                                    )}
                                    {roomMessages.map((message) => (
                                        <div key={message.id} className="rounded-lg bg-[#060e20]/60 p-2.5 text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-secondary">{message.author}</span>
                                                <span className="font-mono text-[10px] text-on-surface-variant/60">
                                                    {message.scope === 'announcement' ? 'Announcement · ' : ''}{new Date(message.at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-on-surface">{message.body}</p>
                                        </div>
                                    ))}
                                </div>

                                {globalChatMode === 'muted' ? (
                                    <p className="mt-4 rounded-xl border border-white/10 bg-surface-container-lowest px-3.5 py-2.5 text-xs text-on-surface-variant">
                                        Room chat is read-only. Use your group detail panel for private team messages.
                                    </p>
                                ) : (
                                    <div className="mt-4 flex gap-2">
                                        <input
                                            type="text"
                                            aria-label={globalChatMode === 'moderated' ? 'Post to the room for review' : 'Post to the room'}
                                            value={globalDraft}
                                            onChange={(e) => setGlobalDraft(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && globalDraft.trim()) {
                                                    const body = globalDraft.trim();
                                                    setGlobalDraft('');
                                                    mutate(`/s/${data.code}/messages`, { scope: 'global', body });
                                                }
                                            }}
                                            className="flex-1 rounded-xl border border-white/10 bg-[#060e20] px-3.5 py-2 text-xs text-on-surface focus:border-secondary focus:outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const body = globalDraft.trim();

                                                if (!body) {
return;
}

                                                setGlobalDraft('');
                                                mutate(`/s/${data.code}/messages`, { scope: 'global', body });
                                            }}
                                            className="rounded-xl bg-secondary px-3 text-on-secondary hover:brightness-110"
                                            aria-label="Send room message"
                                        >
                                            <span className="material-symbols-outlined text-[17px]">send</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                )}

                <ComingNext />
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="glass-panel fixed bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t border-white/10 px-4 backdrop-blur-xl sm:hidden">
                <button
                    type="button"
                    className="relative flex w-16 scale-95 flex-col items-center justify-center gap-1 font-bold text-primary transition-transform"
                >
                    <div className="absolute -top-3.5 h-1 w-8 rounded-b-md bg-primary shadow-[0_0_10px_rgba(109,252,87,0.5)]" />
                    <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        groups
                    </span>
                    <span className="font-mono text-[10px] whitespace-nowrap">Live Room</span>
                </button>

                {chatEnabled && (
                    <button
                        type="button"
                        onClick={() => setChatOpen((o) => !o)}
                        className={`flex w-16 flex-col items-center justify-center gap-1 transition-colors ${
                            chatOpen ? 'text-secondary' : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[22px]">forum</span>
                        <span className="font-mono text-[10px] whitespace-nowrap">Chat</span>
                    </button>
                )}

                <a
                    href="#coming-next"
                    className="flex w-16 flex-col items-center justify-center gap-1 text-on-surface-variant transition-colors hover:text-on-surface"
                >
                    <span className="material-symbols-outlined text-[22px]">insights</span>
                    <span className="font-mono text-[10px] whitespace-nowrap">Roadmap</span>
                </a>
            </nav>
        </div>
    );
}
