import { echo } from '@laravel/echo-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import MemberActionDialog from '@/components/MemberActionDialog';
import GroupCreateDialog from '@/components/GroupCreateDialog';
import { Logo } from '@/components/Logo';
import ServerStatus from '@/components/ServerStatus';
import { configureGroupifyEcho } from '@/lib/echo';
import ConfigEditor from './ConfigEditor';
import PermsEditor from './PermsEditor';
import PluginsPanel from './PluginsPanel';

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
type QuizQuestion = { q: string; options: string[]; answer: number; points: number };
type BoardConfig = {
    rules: Record<string, unknown>;
    fields?: unknown[];
    plugins?: string[];
    perms?: Record<string, Record<string, boolean>>;
    roles?: Record<string, string[]>;
    quiz?: { questions?: QuizQuestion[] };
};
type Board = {
    code: string;
    status: string;
    presence: number;
    pool: { id: number; name: string; custom_role?: string | null }[];
    groups: Group[];
    config: BoardConfig;
    is_admin: boolean;
    quiz?: { status: string; current_index: number; total: number } | null;
};
type AdminMessage = {
    id: number;
    scope: 'global' | 'announcement' | 'group';
    group_id?: number | null;
    author: string;
    body: string;
    at: string;
};

const blankQuizQuestion = (): QuizQuestion => ({ q: '', options: ['', '', '', ''], answer: 0, points: 10 });

const CHANNEL_EVENTS = ['SessionConfigUpdated', 'SessionStateUpdated', 'GroupCreated', 'MembershipChanged', 'SessionDeleted', 'MessageCreated'];

export default function Show({
    session,
}: {
    session: Board & {
        id: number;
        pin: string;
        qr_token?: string;
        ends_at?: string | null;
        archived_at?: string | null;
        purge_at?: string | null;
        admin_token?: string;
        perm_actions?: string[];
        perm_defaults?: Record<string, Record<string, boolean>>;
    };
}) {
    const [board, setBoard] = useState<Board | null>(null);
    const [ready, setReady] = useState(false);
    const [showJoinInfo, setShowJoinInfo] = useState(true);
    const [showBoard, setShowBoard] = useState(true);
    const [activity, setActivity] = useState<{ type: string; payload: Record<string, unknown>; at: string }[]>([]);
    const [templateName, setTemplateName] = useState('');
    const [announceDraft, setAnnounceDraft] = useState('');
    const [proxyNames, setProxyNames] = useState('');
    const [quizDraft, setQuizDraft] = useState<QuizQuestion[]>(() => session.config.quiz?.questions ?? [blankQuizQuestion()]);
    const [modQueue, setModQueue] = useState<{ id: number; scope: string; author: string; body: string }[]>([]);
    const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
    const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
    const [liveCount, setLiveCount] = useState<number | null>(null);
    const [joinBase, setJoinBase] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));
    const [createGroupOpen, setCreateGroupOpen] = useState(false);
    const [timerMin, setTimerMin] = useState('');
    const [guestListText, setGuestListText] = useState('');
    const [createGroupName, setCreateGroupName] = useState('');
    const [createGroupCapacity, setCreateGroupCapacity] = useState('');
    const [groupView, setGroupView] = useState<'cards' | 'table'>('cards');
    const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
    const [memberDialog, setMemberDialog] = useState<{ action: 'move' | 'role' | 'ban'; ids: number[] } | null>(null);
    const [memberActionBusy, setMemberActionBusy] = useState(false);
    const [tab, setTab] = useState<'grid' | 'config' | 'perms' | 'plugins' | 'chat' | 'templates'>('grid');

    const adminToken =
        typeof window === 'undefined' ? (session.admin_token ?? '') : (session.admin_token ?? window.localStorage.getItem('groupify.admin_token') ?? '');
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.search.includes('token=')) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const data = board ?? session;

    const [actionError, setActionError] = useState<string | null>(null);

    const refetch = () => {
        fetch(`/api/sessions/${data.code}/board`, { headers: { 'X-Admin-Token': adminToken } })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                if (json) {
setBoard(json as Board);
}
            })
            .catch(() => setActionError('Board sync failed — reconnecting…'));
        fetch(`/admin/sessions/${session.id}/activity`, { headers: { 'X-Admin-Token': adminToken } })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                if (json) {
setActivity(json.events);
}
            })
            .catch(() => {});
        fetch(`/admin/sessions/${session.id}/messages/pending`, { headers: { 'X-Admin-Token': adminToken } })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
 if (json) {
setModQueue(json.messages);
} 
})
            .catch(() => {});
        fetch(`/admin/sessions/${session.id}/messages`, { headers: { 'X-Admin-Token': adminToken } })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
 if (json) {
setAdminMessages(json.messages as AdminMessage[]);
} 
})
            .catch(() => {});
        fetch(`/admin/sessions/${session.id}/templates`, { headers: { 'X-Admin-Token': adminToken } })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                if (json) {
setTemplates(json.templates);
}
            })
            .catch(() => {});
    };
    const managedParticipants = [
        ...data.pool.map((participant) => ({ id: participant.id, name: participant.name, groupName: 'Unassigned pool' })),
        ...data.groups.flatMap((group) => group.members.map((member) => ({ id: member.id, name: member.name, groupName: group.name }))),
    ];
    const participantIds = managedParticipants.map((participant) => participant.id);
    const allParticipantsSelected = participantIds.length > 0 && participantIds.every((id) => selectedParticipantIds.includes(id));
    const roleNames = Object.keys((data.config.roles ?? {}) as Record<string, string[]>);

    const toggleParticipant = (id: number) => {
        setSelectedParticipantIds((current) => (current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id]));
    };

    const toggleAllParticipants = () => {
        setSelectedParticipantIds(allParticipantsSelected ? [] : participantIds);
    };

    const openMemberAction = (action: 'move' | 'role' | 'ban', ids: number[]) => {
        setMemberDialog({ action, ids });
    };

    const confirmMemberAction = async (value: string) => {
        if (memberDialog === null || memberActionBusy) return;

        setMemberActionBusy(true);
        const xsrf = document.cookie
            .split('; ')
            .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
            ?.split('=')[1];

        try {
            const responses = await Promise.all(
                memberDialog.ids.map((id) => {
                    const endpoint =
                        memberDialog.action === 'move'
                            ? `/admin/sessions/${session.id}/members/${id}/move`
                            : memberDialog.action === 'role'
                              ? `/admin/sessions/${session.id}/members/${id}/role`
                              : `/admin/sessions/${session.id}/members/${id}/ban`;
                    const payload =
                        memberDialog.action === 'move'
                            ? { to_group_id: value === 'pool' ? null : Number(value) }
                            : memberDialog.action === 'role'
                              ? { role: value === '' ? null : value }
                              : { banned: true };

                    return fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-Admin-Token': adminToken,
                            ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {}),
                        },
                        body: JSON.stringify(payload),
                    });
                }),
            );

            if (responses.some((response) => !response.ok)) {
                throw new Error('One or more participant actions failed.');
            }

            setSelectedParticipantIds([]);
            setMemberDialog(null);
            refetch();
        } catch {
            setActionError('Participant action failed — try again.');
        } finally {
            setMemberActionBusy(false);
        }
    };

    // QR drawn on mount + whenever the canvas (re)mounts (F3: toggling join
    // info destroyed the canvas and the effect never re-ran).
    const qrRef = (node: HTMLCanvasElement | null) => {
        if (node && data.code) {
            const base = joinBase || window.location.origin;
            const qrToken = session.qr_token ? `?qr_token=${encodeURIComponent(session.qr_token)}` : '';
            void QRCode.toCanvas(node, `${base}/join/${data.code}${qrToken}`, {
                width: 160,
                margin: 1,
                color: { dark: '#0e1511', light: '#ffffff' },
            });
        }
    };

    // Persist token (AD-3) + live subscription (AD-6)
    useEffect(() => {
        try {
            if (typeof window === 'undefined') {
return;
}

            window.localStorage.setItem('groupify.admin_token', adminToken);
            configureGroupifyEcho({ adminToken });
            const channel = echo().channel(`session.${data.code}`);
            CHANNEL_EVENTS.forEach((ev) => channel.listen(ev, refetch));

            const presence = echo().join(`session.${data.code}`);
            presence.here((members: unknown[]) => setLiveCount(members.length));
            presence.joining(() => setLiveCount((c) => (c === null ? c : c + 1)));
            presence.leaving(() => setLiveCount((c) => (c === null ? c : Math.max(0, c - 1))));
            setReady(true);

            return () => {
                CHANNEL_EVENTS.forEach((ev) => channel.stopListening(ev));
                echo().leaveChannel(`session.${data.code}`);
            };
        } catch (err) {
             
            console.error('[Admin/Show] effect failed', err);
            (window as Window & { __adminEffectError?: string }).__adminEffectError = String(err);
            setReady(true); // render so the error is visible in the page
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.code, adminToken]);

    const act = (url: string, payload: Record<string, unknown> = {}, method: 'POST' | 'PUT' = 'POST') => {
        const xsrf = document.cookie
            .split('; ')
            .find((c) => c.startsWith('XSRF-TOKEN='))
            ?.split('=')[1];
        void fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Admin-Token': adminToken,
                ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {}),
            },
            body: JSON.stringify(payload),
        }).then((r) => {
            if (r.ok) {
refetch();
}
        });
    };
    const createAdminGroup = () => {
        const name = createGroupName.trim();
        const capacity = createGroupCapacity === '' ? undefined : Number(createGroupCapacity);
        act(`/admin/sessions/${session.id}/groups`, {
            ...(name ? { name } : {}),
            ...(capacity ? { capacity } : {}),
        });
        setCreateGroupName('');
        setCreateGroupCapacity('');
        setCreateGroupOpen(false);
    };

    const patchState = (action: string) => {
        const xsrf = document.cookie
            .split('; ')
            .find((c) => c.startsWith('XSRF-TOKEN='))
            ?.split('=')[1];
        void fetch(`/admin/sessions/${session.id}/state`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Admin-Token': adminToken,
                ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {}),
            },
            body: JSON.stringify({ action }),
        })
            .then((r) => {
                if (r.ok) {
                    setActionError(null);
                    refetch();

                    return;
                }

                return r
                    .json()
                    .then((j) => setActionError(j.message ?? `Request failed (${r.status}).`))
                    .catch(() => setActionError(`Request failed (${r.status}).`));
            })
            .catch(() => setActionError('Network error — try again.'));
    };

    const toggleExtension = (key: string, enabled: boolean) => {
        const current = ((data.config.plugins as string[] | undefined) ?? []).filter((e) => e !== key);
        act(`/admin/sessions/${session.id}/config`, { plugins: enabled ? [...current, key] : current });
    };

    // 3-7: projection hotkeys — i toggles join info, h hides the board (Mentimeter pattern)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;

            if (t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable)) {
return;
}

            if (e.key === 'i') {
setShowJoinInfo((v) => !v);
}

            if (e.key === 'h') {
setShowBoard((v) => !v);
}
        };
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (!ready) {
return null;
}

    const frozen = data.config.rules.freeze as boolean;
    const topicsSet = data.groups.filter((g) => Object.values(g.field_values).some((v) => v)).length;
    const minGroupCapacity = Math.max(1, Number(data.config.rules.min_members ?? 1));
    const maxGroupCapacity = Math.max(minGroupCapacity, Number(data.config.rules.max_members ?? 5));

    return (
        <div className="relative min-h-screen bg-[#020618] font-sans text-on-surface antialiased selection:bg-primary/30">
            {/* Atmospheric Background Ambient Gradients */}
            <div className="pointer-events-none fixed inset-0 z-0 bg-radial-glow opacity-80" />

            {/* Desktop SideNav */}
            <aside className="fixed top-0 left-0 z-30 hidden h-screen w-64 flex-col justify-between border-r border-white/10 bg-surface-container-low/95 p-6 backdrop-blur-xl lg:flex">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <Logo className="h-9 w-9 text-primary drop-shadow-[0_0_15px_rgba(109,252,87,0.3)]" />
                        <div>
                            <h2 className="font-display text-lg font-bold text-on-surface">Groupify Admin</h2>
                            <p className="flex items-center gap-1.5 font-mono text-[11px] text-on-surface-variant">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_6px_#6dfc57]" />
                                <span>Live Session</span>
                            </p>
                        </div>
                    </div>

                    <nav className="flex flex-col gap-1.5 pt-2">
                        {(
                            [
                                ['grid', 'grid_view', 'Live Grid'],
                                ['config', 'tune', 'Configuration'],
                                ['perms', 'admin_panel_settings', 'Permissions'],
                                ['chat', 'forum', 'Chat monitor'],
                                ['plugins', 'widgets', 'Plugins'],
                                ['templates', 'history', 'Templates & Activity'],
                            ] as const
                        ).map(([key, icon, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    setTab(key);
                                    if (key === 'chat') {
                                        refetch();
                                    }
                                }}
                                className={`flex items-center gap-3 rounded-xl p-3 font-sans text-sm transition-all ${
                                    tab === key
                                        ? 'bg-surface-variant/40 font-semibold text-secondary shadow-[0_0_12px_rgba(76,215,246,0.2)]'
                                        : 'text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface'
                                }`}
                            >
                                <span
                                    className="material-symbols-outlined text-[20px]"
                                    style={tab === key ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                >
                                    {icon}
                                </span>
                                <span>{label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                    <button
                        type="button"
                        onClick={() => setCreateGroupOpen((open) => !open)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-secondary/35 bg-secondary/10 py-3 font-mono text-xs font-bold uppercase tracking-wider text-secondary transition-colors hover:bg-secondary/20"
                    >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        <span>Create Group</span>
                    </button>

                <div className="flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={() => act(`/admin/sessions/${session.id}/auto-distribute`)}
                        disabled={data.pool.length === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container py-3 font-mono text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_15px_rgba(78,222,61,0.35)] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <span className="material-symbols-outlined text-[16px]">bolt</span>
                        <span>Auto-Distribute</span>
                    </button>
                    <p className="text-center font-mono text-[10px] text-on-surface-variant/50">
                        Hotkeys: <span className="text-secondary font-bold">i</span> join card · <span className="text-secondary font-bold">h</span> board
                    </p>
                </div>
            </aside>

            {/* Main Content Dashboard */}
            <main className="relative z-10 flex-1 p-4 pb-40 md:p-8 md:pb-48 lg:ml-64 lg:pb-40">
                <div className="mx-auto w-full max-w-7xl">
                    {/* Error Banner */}
                    {actionError && (
                        <div className="mb-6 flex items-center justify-between rounded-xl border border-error/40 bg-error-container/20 px-4 py-2.5 text-xs text-error backdrop-blur-md">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                <span>{actionError}</span>
                            </div>
                            <button type="button" onClick={() => setActionError(null)} className="text-on-surface-variant hover:text-on-surface">
                                ✕
                            </button>
                        </div>
                    )}

                    <ServerStatus />

                    {/* Mobile Top Header */}
                    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 lg:hidden">
                        <div className="flex items-center gap-2.5">
                            <Logo className="h-7 w-7 text-primary" />
                            <h1 className="font-display text-xl font-extrabold text-on-surface">Groupify Admin</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-surface-container-high px-3 py-1 font-mono text-xs text-primary">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                                {(liveCount ?? data.presence)} Online
                            </span>
                        </div>
                    </header>

                    {/* Mobile tab bar */}
                    <nav className="mb-4 flex items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-surface-container-low/60 p-1 lg:hidden hide-scrollbar">
                        {(
                            [
                                ['grid', 'Live Grid'],
                                ['config', 'Config'],
                                ['perms', 'Perms'],
                                ['chat', 'Chat'],
                                ['plugins', 'Plugins'],
                                ['templates', 'History'],
                            ] as const
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    setTab(key);
                                    if (key === 'chat') {
                                        refetch();
                                    }
                                }}
                                className={`shrink-0 rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide transition-colors ${
                                    tab === key ? 'bg-secondary/20 text-secondary' : 'text-on-surface-variant'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </nav>

                    {/* Bento Header Area (QR + Controls + Stat Tiles) */}
                    {showJoinInfo && tab === 'grid' && (
                        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-12">
                            {/* QR Card */}
                            <div className="glass-card flex flex-col items-center justify-center gap-3.5 rounded-2xl p-5 shadow-2xl backdrop-blur-xl md:col-span-4 lg:col-span-3">
                                <div className="flex h-36 w-36 items-center justify-center rounded-xl bg-white p-2.5 shadow-md">
                                    <canvas key={joinBase} ref={qrRef} className="h-full w-full object-contain" />
                                </div>
                                <div className="text-center">
                                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                        Scan to Join
                                    </p>
                                    <p className="mt-0.5 font-mono text-2xl font-extrabold tracking-widest text-secondary">
                                        {data.code}
                                    </p>
                                    <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                                        <span className="material-symbols-outlined text-[13px]">qr_code_2</span>
                                        {data.config.rules.join_mode === 'open'
                                            ? 'Open access · direct URL skips PIN'
                                            : data.config.rules.qr_pinless === false
                                              ? 'PIN required'
                                              : 'QR bypass enabled'}
                                    </p>
                                </div>

                                <label className="w-full">
                                    <span className="mb-1 block text-center font-mono text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Join URL base</span>
                                    <input
                                        type="url"
                                        value={joinBase}
                                        onChange={(e) => setJoinBase(e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-surface-container-lowest px-2.5 py-1 text-center font-mono text-xs text-secondary outline-none transition-all focus:border-secondary focus:ring-1 focus:ring-secondary"
                                        title="Join URL for phones on LAN"
                                    />
                                    <span className="mt-1 block text-center font-mono text-[9px] leading-tight text-on-surface-variant/60">
                                        Use this computer's LAN address when phones are on the same network.
                                    </span>
                                </label>
                            </div>

                            {/* Control Card with Stat Tiles */}
                            <div className="glass-card flex flex-col justify-between gap-5 rounded-2xl p-5 shadow-2xl backdrop-blur-xl md:col-span-8 lg:col-span-9">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="font-display text-2xl font-extrabold text-on-surface">Live Session</h2>
                                            {frozen && (
                                                <span className="rounded-full bg-error-container px-2.5 py-0.5 font-mono text-[10px] font-bold text-error uppercase">
                                                    FROZEN
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3">
                                            <span className="rounded-full bg-[#ec4899] px-3 py-0.5 font-mono text-xs font-bold tracking-widest text-white shadow-[0_0_10px_rgba(236,72,153,0.35)]">
                                                PIN: {session.pin}
                                            </span>
                                            <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary">
                                                <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_6px_#6dfc57]" />
                                                {(liveCount ?? data.presence)} online
                                            </span>
                                        <span className="font-mono text-[10px] text-on-surface-variant">
                                            {session.ends_at ? `Ends ${new Date(session.ends_at).toLocaleString()}` : 'Manual end'}
                                        </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons Row */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => patchState(frozen ? 'unfreeze' : 'freeze')}
                                            className={`rounded-xl border px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                                frozen
                                                    ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                                                    : 'border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20'
                                            }`}
                                        >
                                            {frozen ? 'Unfreeze' : 'Freeze'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => act(`/admin/sessions/${session.id}/dissolve`)}
                                            className="rounded-xl border border-error/40 bg-error/10 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-error transition-all hover:bg-error/20 active:scale-95"
                                        >
                                            Dissolve all
                                        </button>
                                        <a
                                            href={`/admin/sessions/${session.id}/export`}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-secondary transition-all hover:bg-secondary/20 active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-[15px]">download</span>
                                            <span>Export</span>
                                        </a>
                                    </div>
                                </div>

                                {/* Controls Row (Timer & Guest list) */}
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <label className="flex items-end gap-1.5">
                                        <span className="sr-only">Auto-dissolve minutes</span>
                                        <span className="relative">
                                            <span className="absolute -top-4 left-1 font-mono text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Auto-dissolve</span>
                                            <input
                                                type="number"
                                                min={1}
                                                value={timerMin}
                                                onChange={(e) => setTimerMin(e.target.value)}
                                                className="w-40 rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface outline-none transition-all focus:border-secondary"
                                            />
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const v = timerMin.trim();
                                                fetch(`/admin/sessions/${session.id}/config`, {
                                                    method: 'PUT',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        Accept: 'application/json',
                                                        'X-Admin-Token': adminToken,
                                                        'X-XSRF-TOKEN': decodeURIComponent(
                                                            document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                                        ),
                                                    },
                                                    body: JSON.stringify({ rules: { auto_dissolve_minutes: v === '' ? null : Number(v) } }),
                                                }).then((r) => {
 if (r.ok) {
 refetch(); setTimerMin(''); 
} 
});
                                            }}
                                            className="rounded-xl border border-white/10 bg-surface-variant/40 px-3 py-2 font-mono text-xs font-semibold text-on-surface transition-all hover:bg-surface-variant"
                                        >
                                            Set timer
                                        </button>
                                    </label>
                                    <label className="flex min-w-[240px] flex-1 items-end gap-1.5">
                                        <span className="sr-only">Guest list names</span>
                                        <span className="relative flex-1">
                                            <span className="absolute -top-4 left-1 font-mono text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Guest list</span>
                                            <input
                                                type="text"
                                                value={guestListText}
                                                onChange={(e) => setGuestListText(e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface outline-none transition-all focus:border-secondary"
                                            />
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const names = guestListText
                                                    .split(',')
                                                    .map((n) => n.trim())
                                                    .filter(Boolean);
                                                fetch(`/admin/sessions/${session.id}/config`, {
                                                    method: 'PUT',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        Accept: 'application/json',
                                                        'X-Admin-Token': adminToken,
                                                        'X-XSRF-TOKEN': decodeURIComponent(
                                                            document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                                        ),
                                                    },
                                                    body: JSON.stringify({ rules: { guest_list: names } }),
                                                }).then((r) => {
 if (r.ok) {
 refetch(); setGuestListText(''); 
} 
});
                                            }}
                                            className="rounded-xl border border-white/10 bg-surface-variant/40 px-3 py-2 font-mono text-xs font-semibold text-on-surface transition-all hover:bg-surface-variant shrink-0"
                                        >
                                            Set guest list
                                        </button>
                                    </label>
                                </div>

                                {/* 4-Column Stat Tiles */}
                                <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-center sm:grid-cols-4">
                                    <div className="rounded-xl bg-surface-container-low/60 p-2.5 border border-white/5">
                                        <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">PIN</p>
                                        <p className="mt-0.5 font-mono text-2xl font-extrabold text-on-surface">{session.pin}</p>
                                    </div>
                                    <div className="rounded-xl bg-surface-container-low/60 p-2.5 border border-white/5">
                                        <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Topics Set</p>
                                        <p className="mt-0.5 font-mono text-2xl font-extrabold text-secondary">{topicsSet}/{data.groups.length}</p>
                                    </div>
                                    <div className="rounded-xl bg-surface-container-low/60 p-2.5 border border-white/5">
                                        <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">In Pool</p>
                                        <p className="mt-0.5 font-mono text-2xl font-extrabold text-primary">{data.pool.length}</p>
                                    </div>
                                    <div className="rounded-xl bg-surface-container-low/60 p-2.5 border border-white/5">
                                        <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Groups</p>
                                        <p className="mt-0.5 font-mono text-2xl font-extrabold text-on-surface">{data.groups.length}</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Live Groups Grid */}
                    {showBoard && tab === 'grid' && (
                        <>
                            <div className="mb-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-secondary">
                                        Active Groups ({data.groups.length})
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <label className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-on-surface-variant">
                                            <input
                                                type="checkbox"
                                                checked={allParticipantsSelected}
                                                onChange={toggleAllParticipants}
                                                className="h-3.5 w-3.5 accent-primary"
                                                aria-label="Select all participants"
                                            />
                                            Select all
                                        </label>
                                        <div className="flex rounded-lg border border-white/10 p-0.5" aria-label="Group view">
                                            {(['cards', 'table'] as const).map((view) => (
                                                <button
                                                    key={view}
                                                    type="button"
                                                    aria-pressed={groupView === view}
                                                    onClick={() => setGroupView(view)}
                                                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold capitalize transition-colors ${
                                                        groupView === view ? 'bg-secondary/20 text-secondary' : 'text-on-surface-variant hover:text-on-surface'
                                                    }`}
                                                >
                                                    {view}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCreateGroupOpen((open) => !open)}
                                            className="rounded-lg border border-secondary/35 bg-secondary/10 px-3 py-1.5 font-mono text-xs font-bold text-secondary transition-colors hover:bg-secondary/20"
                                        >
                                            + Create group
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => act(`/admin/sessions/${session.id}/auto-distribute`)}
                                            disabled={data.pool.length === 0}
                                            className="rounded-lg bg-primary-container px-3 py-1.5 font-mono text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Auto-Distribute
                                        </button>
                                    </div>
                                </div>
                                {selectedParticipantIds.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-secondary/25 bg-secondary/5 px-3 py-2.5">
                                        <span className="mr-1 text-xs font-semibold text-secondary">{selectedParticipantIds.length} selected</span>
                                        <button
                                            type="button"
                                            onClick={() => openMemberAction('move', selectedParticipantIds)}
                                            className="rounded-lg border border-white/10 bg-surface-container-lowest px-3 py-1.5 text-[11px] font-semibold text-on-surface hover:border-secondary/50"
                                        >
                                            Move
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openMemberAction('role', selectedParticipantIds)}
                                            disabled={roleNames.length === 0}
                                            className="rounded-lg border border-white/10 bg-surface-container-lowest px-3 py-1.5 text-[11px] font-semibold text-on-surface hover:border-secondary/50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Assign role
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openMemberAction('ban', selectedParticipantIds)}
                                            className="rounded-lg border border-error/30 bg-error-container/15 px-3 py-1.5 text-[11px] font-semibold text-error hover:bg-error-container/30"
                                        >
                                            Ban
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedParticipantIds([])}
                                            className="ml-auto px-2 py-1.5 text-[11px] text-on-surface-variant hover:text-on-surface"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}
                            </div>
                            {createGroupOpen && (
                                <GroupCreateDialog
                                    title="Add an empty group"
                                    description="Create a team before participants arrive, then place people into it from the roster."
                                    name={createGroupName}
                                    onNameChange={setCreateGroupName}
                                    capacity={createGroupCapacity}
                                    onCapacityChange={setCreateGroupCapacity}
                                    capacityOptions={[
                                        { value: '', label: 'Session default', hint: `${minGroupCapacity}–${maxGroupCapacity} people` },
                                        ...Array.from({ length: maxGroupCapacity - minGroupCapacity + 1 }, (_, i) => minGroupCapacity + i).map((size) => ({
                                            value: String(size),
                                            label: `${size} ${size === 1 ? 'person' : 'people'}`,
                                            hint: 'Fixed group capacity',
                                        })),
                                    ]}
                                    onClose={() => {
                                        setCreateGroupOpen(false);
                                        setCreateGroupName('');
                                        setCreateGroupCapacity('');
                                    }}
                                    onSubmit={createAdminGroup}
                                    submitLabel="Add empty group"
                                />
                            )}

                            {groupView === 'cards' ? (
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                {data.groups.map((g) => {
                                    const full = g.open_slots <= 0;

                                    return (
                                        <article
                                            key={g.id}
                                            className={`glass-card group relative flex flex-col justify-between rounded-2xl p-5 shadow-lg transition-all duration-300 ${
                                                full ? 'border-[#ec4899]/50 bg-[#ec4899]/5' : 'hover:border-primary/40'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-start justify-between border-b border-white/10 pb-3">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`font-display text-base font-bold text-on-surface ${
                                                            full ? 'line-through decoration-white/30 text-on-surface-variant' : ''
                                                        }`}>
                                                            {g.name}
                                                        </h4>
                                                        {full && (
                                                            <span className="rounded bg-[#ec4899] px-2 py-0.5 font-mono text-[9px] font-bold text-white uppercase">
                                                                FULL
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Slot Dots */}
                                                    <div className="flex gap-1 pt-1">
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

                                                {/* Field values */}
                                                {Object.entries(g.field_values).map(([k, v]) => (
                                                    <p key={k} className="mt-2 font-mono text-xs text-secondary uppercase">
                                                        {k}: <span className="text-on-surface font-sans capitalize">{v}</span>
                                                    </p>
                                                ))}

                                                {/* Member list */}
                                                <ul className="mt-3.5 space-y-2 text-xs text-on-surface">
                                                    {g.members.map((m) => (
                                                        <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low/50 px-2 py-1.5">
                                                            <div className="flex min-w-0 items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedParticipantIds.includes(m.id)}
                                                                    onChange={() => toggleParticipant(m.id)}
                                                                    className="h-3.5 w-3.5 shrink-0 accent-primary"
                                                                    aria-label={`Select ${m.name}`}
                                                                />
                                                                <span
                                                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                                        m.role === 'leader' ? 'bg-primary shadow-[0_0_6px_#6dfc57]' : 'bg-on-surface-variant/40'
                                                                    }`}
                                                                />
                                                                <span className={`truncate ${m.role === 'leader' ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>
                                                                    {m.name}
                                                                </span>
                                                                {m.role === 'leader' && (
                                                                    <span className="rounded bg-primary/15 px-1.5 py-0.2 font-mono text-[9px] font-bold text-primary">lead</span>
                                                                )}
                                                                {m.custom_role && (
                                                                    <span className="hidden rounded bg-secondary/10 px-1.5 py-0.2 font-mono text-[9px] text-secondary sm:inline">{m.custom_role}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex shrink-0 items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openMemberAction('move', [m.id])}
                                                                    className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-on-surface-variant hover:border-secondary/50 hover:text-secondary"
                                                                >
                                                                    Move
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openMemberAction('role', [m.id])}
                                                                    disabled={roleNames.length === 0}
                                                                    className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-on-surface-variant hover:border-secondary/50 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-40"
                                                                >
                                                                    Role
                                                                </button>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => act(`/admin/sessions/${session.id}/dissolve`, { group_id: g.id })}
                                                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-surface-container/30 py-1.5 font-mono text-[11px] text-on-surface-variant transition-all hover:border-error/40 hover:bg-error/10 hover:text-error"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                                <span>Dissolve this group</span>
                                            </button>
                                        </article>
                                    );
                                })}

                                {data.groups.length === 0 && (
                                    <div className="glass-card col-span-full rounded-2xl border-dashed border-white/15 p-12 text-center">
                                        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">groups</span>
                                        <p className="mt-2 font-display text-base font-bold text-on-surface">No groups yet</p>
                                        <p className="mt-1 text-xs text-on-surface-variant">Participants will create groups or you can auto-distribute from pool.</p>
                                    </div>
                                )}
                            </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface-container-lowest">
                                    <table className="w-full min-w-[680px] text-left text-xs">
                                        <thead className="border-b border-white/10 bg-surface-container-low">
                                            <tr>
                                                <th className="w-12 px-4 py-3"><span className="sr-only">Select</span></th>
                                                <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Group</th>
                                                <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Participant</th>
                                                <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Role</th>
                                                <th className="px-4 py-3 text-right font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.groups.flatMap((group) =>
                                                group.members.map((member) => (
                                                    <tr key={`${group.id}-${member.id}`} className="border-b border-white/5 last:border-0">
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedParticipantIds.includes(member.id)}
                                                                onChange={() => toggleParticipant(member.id)}
                                                                className="h-3.5 w-3.5 accent-primary"
                                                                aria-label={`Select ${member.name}`}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 font-semibold text-secondary">{group.name}</td>
                                                        <td className="px-4 py-3 font-semibold text-on-surface">{member.name}</td>
                                                        <td className="px-4 py-3 text-on-surface-variant">
                                                            <span className={member.role === 'leader' ? 'font-semibold text-primary' : ''}>{member.role}</span>
                                                            {member.custom_role && <span className="ml-2 text-secondary">· {member.custom_role}</span>}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex justify-end gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openMemberAction('move', [member.id])}
                                                                    className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-on-surface-variant hover:border-secondary/50 hover:text-secondary"
                                                                >
                                                                    Move
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openMemberAction('role', [member.id])}
                                                                    disabled={roleNames.length === 0}
                                                                    className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-on-surface-variant hover:border-secondary/50 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-40"
                                                                >
                                                                    Role
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )),
                                            )}
                                        </tbody>
                                    </table>
                                    {managedParticipants.length === 0 && (
                                        <p className="p-10 text-center text-xs text-on-surface-variant/60">Participants will appear here after they join.</p>
                                    )}
                                </div>
                            )}

                            {/* Pending requests panel (if any) */}
                            {data.groups.some((g) => (g as Group & { pending?: { id: number; name: string }[] }).pending?.length) && (
                                <section className="glass-card mt-8 rounded-2xl border-secondary/30 p-5 shadow-xl">
                                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-secondary">
                                        Pending Group Join Requests
                                    </h3>
                                    <div className="mt-3 space-y-2">
                                        {data.groups.map((g) =>
                                            (g as Group & { pending?: { id: number; name: string }[] }).pending?.map((p) => (
                                                <div key={p.id} className="flex items-center justify-between rounded-xl bg-surface-container-low p-3 text-xs">
                                                    <div>
                                                        <span className="font-bold text-on-surface">{p.name}</span>
                                                        <span className="text-on-surface-variant"> requested to join </span>
                                                        <span className="font-bold text-secondary">{g.name}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void fetch(`/s/${data.code}/groups/${g.id}/requests/${p.id}/approve`, {
                                                                    method: 'POST',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        Accept: 'application/json',
                                                                        'X-Admin-Token': adminToken,
                                                                        'X-XSRF-TOKEN': decodeURIComponent(
                                                                            document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                                                        ),
                                                                    },
                                                                }).then((r) => {
 if (r.ok) {
refetch();
} 
})
                                                            }
                                                            className="rounded-lg bg-primary-container px-3 py-1 font-bold text-on-primary-container hover:brightness-110"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void fetch(`/s/${data.code}/groups/${g.id}/requests/${p.id}/reject`, {
                                                                    method: 'POST',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        Accept: 'application/json',
                                                                        'X-Admin-Token': adminToken,
                                                                        'X-XSRF-TOKEN': decodeURIComponent(
                                                                            document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                                                        ),
                                                                    },
                                                                }).then((r) => {
 if (r.ok) {
refetch();
} 
})
                                                            }
                                                            className="rounded-lg bg-error-container/40 px-3 py-1 font-bold text-error hover:bg-error-container"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            )),
                                        )}
                                    </div>
                                </section>
                            )}
                        </>
                    )}

                    {/* ==== Scoped chat monitor ==== */}
                    {tab === 'chat' && (
                        <div className="space-y-6">
                            <section className="glass-card rounded-2xl p-5 shadow-xl">
                                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                                    <div>
                                        <h3 className="font-display text-base font-bold text-on-surface">Room chat</h3>
                                        <p className="mt-1 text-xs text-on-surface-variant">Global posts and facilitator announcements visible to the whole session.</p>
                                    </div>
                                    <span className="rounded-full bg-secondary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-secondary">
                                        {adminMessages.filter((message) => message.scope !== 'group').length} posts
                                    </span>
                                </div>
                                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                                    {adminMessages.filter((message) => message.scope !== 'group').map((message) => (
                                        <article key={message.id} className="rounded-xl border border-white/10 bg-surface-container-lowest p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-semibold text-secondary">{message.author}</span>
                                                <span className="font-mono text-[10px] text-on-surface-variant/60">{message.scope === 'announcement' ? 'Announcement' : 'Global'} · {new Date(message.at).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="mt-1.5 text-xs leading-relaxed text-on-surface">{message.body}</p>
                                        </article>
                                    ))}
                                    {adminMessages.filter((message) => message.scope !== 'group').length === 0 && (
                                        <p className="py-8 text-center text-xs text-on-surface-variant/60">No room messages yet.</p>
                                    )}
                                </div>
                            </section>

                            <section className="glass-card rounded-2xl p-5 shadow-xl">
                                <div className="border-b border-white/10 pb-3">
                                    <h3 className="font-display text-base font-bold text-on-surface">Group channels</h3>
                                    <p className="mt-1 text-xs text-on-surface-variant">Each group is isolated; participants only receive their own channel.</p>
                                </div>
                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    {data.groups.map((group) => {
                                        const groupMessages = adminMessages.filter((message) => message.scope === 'group' && message.group_id === group.id);

                                        return (
                                            <article key={group.id} className="rounded-xl border border-white/10 bg-surface-container-lowest p-4">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="font-semibold text-on-surface">{group.name}</h4>
                                                    <span className="font-mono text-[10px] text-on-surface-variant">{groupMessages.length} posts</span>
                                                </div>
                                                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                                                    {groupMessages.map((message) => (
                                                        <div key={message.id} className="rounded-lg bg-surface-container-low p-2.5 text-xs">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-semibold text-primary">{message.author}</span>
                                                                <span className="font-mono text-[10px] text-on-surface-variant/60">{new Date(message.at).toLocaleTimeString()}</span>
                                                            </div>
                                                            <p className="mt-1 text-on-surface">{message.body}</p>
                                                        </div>
                                                    ))}
                                                    {groupMessages.length === 0 && <p className="py-4 text-center text-[11px] text-on-surface-variant/50">No posts in this channel.</p>}
                                                </div>
                                            </article>
                                        );
                                    })}
                                    {data.groups.length === 0 && <p className="text-xs text-on-surface-variant/60">Groups will appear here as they are created.</p>}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ==== Extensions tab ==== */}
                    {tab === 'plugins' && (
                        <PluginsPanel
                            plugins={(data.config.plugins ?? []) as string[]}
                            onToggle={toggleExtension}
                        >
                            {/* Announcements Module */}
                            {(data.config.plugins ?? []).includes('announcements') && (
                                <section className="glass-card mt-6 rounded-2xl p-5">
                                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-secondary">
                                        Broadcast Announcement
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <input
                                            type="text"
                                            aria-label="Announcement message"
                                            value={announceDraft}
                                            onChange={(e) => setAnnounceDraft(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && announceDraft.trim()) {
                                                    const body = announceDraft;
                                                    setAnnounceDraft('');
                                                    void fetch(`/s/${data.code}/messages`, {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            Accept: 'application/json',
                                                            'X-Admin-Token': adminToken,
                                                            'X-XSRF-TOKEN': decodeURIComponent(
                                                                document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                                            ),
                                                        },
                                                        body: JSON.stringify({ scope: 'announcement', body }),
                                                    }).then((r) => {
 if (r.ok) {
refetch();
} 
});
                                                }
                                            }}
                                            className="flex-1 rounded-xl border border-white/10 bg-surface-container-lowest px-4 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-secondary transition-all"
                                        />
                                    </div>
                                </section>
                            )}

                            {/* Quiz Builder Module */}
                            {(data.config.plugins ?? []).includes('quiz') && (
                            <section className="glass-card mt-8 rounded-2xl p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                                    <div>
                                        <h3 className="font-display text-base font-bold text-on-surface">Group Quiz</h3>
                                        {data.quiz && (
                                            <p className="mt-0.5 font-mono text-xs text-on-surface-variant">
                                                {data.quiz.status === 'live' && `Live · Question ${data.quiz.current_index + 1} of ${data.quiz.total}`}
                                                {data.quiz.status === 'done' && 'Finished'}
                                            </p>
                                        )}
                                    </div>
                                    {data.quiz?.status === 'live' ? (
                                        <span className="flex items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1 font-mono text-xs font-bold text-secondary">
                                            <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                                            Running…
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => act(`/admin/sessions/${session.id}/quiz/start`)}
                                            className="rounded-xl bg-primary-container px-4 py-2 font-display text-xs font-bold text-on-primary-container shadow-[0_0_15px_rgba(78,222,61,0.25)] hover:brightness-110"
                                        >
                                            Start Quiz
                                        </button>
                                    )}
                                </div>

                                {(!data.quiz || data.quiz.status === 'done') && (
                                    <div className="mt-4 space-y-3">
                                        {quizDraft.map((qq, qi) => (
                                            <div key={qi} className="rounded-xl border border-white/10 bg-surface-container-lowest p-4">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        value={qq.q}
                                                        onChange={(e) =>
                                                            setQuizDraft((d) => d.map((x, i) => (i === qi ? { ...x, q: e.target.value } : x)))
                                                        }
                                                        aria-label={`Question ${qi + 1}`}
                                                        className="w-full rounded-xl border border-white/10 bg-surface-container px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                                                    />
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={100}
                                                        value={qq.points}
                                                        onChange={(e) =>
                                                            setQuizDraft((d) => d.map((x, i) => (i === qi ? { ...x, points: Number(e.target.value) } : x)))
                                                        }
                                                        className="w-20 rounded-xl border border-white/10 bg-surface-container px-2.5 py-2 font-mono text-xs text-on-surface outline-none focus:border-secondary"
                                                        aria-label="points"
                                                    />
                                                    <span className="font-mono text-xs text-on-surface-variant">pts</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuizDraft((d) => d.filter((_, i) => i !== qi))}
                                                        className="rounded-lg bg-error-container/40 px-2.5 py-2 text-xs text-error hover:bg-error-container"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                <div className="mt-2.5 space-y-1.5">
                                                    {qq.options.map((opt, oi) => (
                                                        <div key={oi} className="flex items-center gap-2.5">
                                                            <button
                                                                type="button"
                                                                role="radio"
                                                                aria-checked={qq.answer === oi}
                                                                aria-label={`correct answer ${oi + 1}`}
                                                                onClick={() => setQuizDraft((d) => d.map((x, i) => (i === qi ? { ...x, answer: oi } : x)))}
                                                                className={`h-4 w-4 shrink-0 rounded-full border-2 transition-all ${
                                                                    qq.answer === oi
                                                                        ? 'border-primary bg-primary shadow-[0_0_8px_#6dfc57]'
                                                                        : 'border-white/30 bg-transparent'
                                                                }`}
                                                            />
                                                            <input
                                                                value={opt}
                                                                onChange={(e) =>
                                                                    setQuizDraft((d) =>
                                                                        d.map((x, i) =>
                                                                            i === qi ? { ...x, options: x.options.map((o, j) => (j === oi ? e.target.value : o)) } : x,
                                                                        ),
                                                                    )
                                                                }
                                                                aria-label={`Option ${oi + 1}`}
                                                                className="w-full rounded-xl border border-white/10 bg-surface-container px-3 py-1.5 text-xs text-on-surface outline-none focus:border-secondary"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setQuizDraft((d) => [...d, { q: '', options: ['', '', '', ''], answer: 0, points: 10 }])}
                                                className="rounded-xl border border-white/10 bg-surface-variant/40 px-4 py-2 font-sans text-xs font-semibold text-on-surface hover:bg-surface-variant"
                                            >
                                                + Question
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    act(`/admin/sessions/${session.id}/quiz`, {
                                                        questions: quizDraft
                                                            .filter((qq) => qq.q.trim())
                                                            .map((qq) => ({
                                                                q: qq.q.trim(),
                                                                options: qq.options.map((o) => o.trim()).filter(Boolean),
                                                                answer: qq.answer,
                                                                points: qq.points,
                                                            })),
                                                    }, 'PUT')
                                                }
                                                className="rounded-xl bg-secondary px-5 py-2 font-display text-xs font-bold text-on-secondary shadow-[0_0_15px_rgba(76,215,246,0.25)] hover:brightness-110"
                                            >
                                                Save Quiz
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>
                            )}

                            {/* Proxy Importer Module */}
                            {(data.config.plugins ?? []).includes('proxy') && (
                            <section className="glass-card mt-8 rounded-2xl p-5">
                                <h3 className="font-display text-base font-bold text-on-surface">Proxy Seat Importer</h3>
                                <p className="mt-0.5 text-xs text-on-surface-variant">
                                    Pre-register absentees (e.g. field trips): one name per line. They claim their seat on join.
                                </p>
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <label className="flex flex-1 flex-col gap-1.5">
                                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Names to pre-register</span>
                                    <textarea
                                        aria-label="Names to pre-register"
                                        value={proxyNames}
                                        onChange={(e) => setProxyNames(e.target.value)}
                                        rows={3}
                                        className="w-full rounded-xl border border-white/10 bg-surface-container-lowest p-3 font-mono text-xs text-on-surface outline-none focus:border-secondary"
                                    />
                                </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const names = proxyNames.split('\n').map((n) => n.trim()).filter(Boolean);

                                            if (!names.length) {
return;
}

                                            act(`/admin/sessions/${session.id}/participants`, { names });
                                        }}
                                        className="h-fit shrink-0 rounded-xl bg-secondary px-5 py-3 font-display text-xs font-bold text-on-secondary shadow-[0_0_15px_rgba(76,215,246,0.25)] hover:brightness-110"
                                    >
                                        Create Seats
                                    </button>
                                </div>
                            </section>
                            )}

                            {/* Moderation Queue */}
                            {(data.config.plugins ?? []).includes('moderation') && modQueue.length > 0 && (
                                <section className="glass-card mt-8 rounded-2xl border-tertiary/30 p-5">
                                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-tertiary">
                                        Moderation Queue ({modQueue.length})
                                    </h3>
                                    <div className="mt-3 space-y-2">
                                        {modQueue.map((m) => (
                                            <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-3 text-xs">
                                                <span className="truncate">
                                                    <span className="font-bold text-secondary">{m.author}:</span> {m.body}
                                                </span>
                                                <div className="flex shrink-0 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void fetch(`/admin/sessions/${session.id}/messages/${m.id}/decide`, {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    Accept: 'application/json',
                                                                    'X-Admin-Token': adminToken,
                                                                    'X-XSRF-TOKEN': decodeURIComponent(
                                                                        document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                                                    ),
                                                                },
                                                                body: JSON.stringify({ action: 'approve' }),
                                                            }).then((r) => {
 if (r.ok) {
refetch();
} 
});
                                                        }}
                                                        className="rounded-lg bg-primary-container px-3 py-1 font-bold text-on-primary-container hover:brightness-110"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void fetch(`/admin/sessions/${session.id}/messages/${m.id}/decide`, {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    Accept: 'application/json',
                                                                    'X-Admin-Token': adminToken,
                                                                    'X-XSRF-TOKEN': decodeURIComponent(
                                                                        document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                                                    ),
                                                                },
                                                                body: JSON.stringify({ action: 'reject' }),
                                                            }).then((r) => {
 if (r.ok) {
refetch();
} 
});
                                                        }}
                                                        className="rounded-lg bg-error-container/40 px-3 py-1 font-bold text-error hover:bg-error-container"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </PluginsPanel>
                    )}

                    {/* ==== Configuration tab ==== */}
                    {tab === 'config' && (
                        <ConfigEditor
                            rules={data.config.rules}
                            fields={
                                (data.config.fields ?? []) as {
                                    name: string;
                                    type: string;
                                    required?: boolean;
                                    filled_by?: string;
                                    on_card?: boolean;
                                    in_csv?: boolean;
                                    filterable?: boolean;
                                }[]
                            }
                            onSave={(payload) => act(`/admin/sessions/${session.id}/config`, payload)}
                        />
                    )}

                    {/* ==== Permissions tab ==== */}
                    {tab === 'perms' && (
                        <PermsEditor
                            sessionId={session.id}
                            code={data.code}
                            adminToken={adminToken}
                            actions={session.perm_actions ?? []}
                            defaults={session.perm_defaults ?? {}}
                            perms={(data.config.perms ?? {}) as Record<string, Record<string, boolean>>}
                            roles={(data.config.roles ?? {}) as Record<string, string[]>}
                            participants={[
                                ...data.pool,
                                ...data.groups.flatMap((group) => group.members),
                            ]}
                            onSaved={refetch}
                        />
                    )}

                    {/* ==== Plugins tab ==== */}
                    

                    {/* ==== Templates & Activity tab ==== */}
                    {tab === 'templates' && (
                        <>

                            {/* Session Templates */}
                            <section className="glass-card mt-8 flex flex-wrap items-center gap-3 rounded-2xl p-5">
                                <span className="font-mono text-xs font-bold uppercase tracking-widest text-secondary">
                                    Templates
                                </span>
                                <input
                                    type="text"
                                    aria-label="Template name"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    className="w-44 rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface outline-none focus:border-secondary"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const name = templateName.trim();

                                        if (!name) {
return;
}

                                        void fetch(`/admin/sessions/${session.id}/templates`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                Accept: 'application/json',
                                                'X-Admin-Token': adminToken,
                                                'X-XSRF-TOKEN': decodeURIComponent(
                                                    document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                                ),
                                            },
                                            body: JSON.stringify({ name }),
                                        }).then((r) => {
 if (r.ok) {
 setTemplateName(''); refetch(); 
} 
});
                                    }}
                                    className="rounded-xl border border-white/10 bg-surface-variant/40 px-4 py-1.5 font-sans text-xs font-semibold text-on-surface hover:bg-surface-variant"
                                >
                                    Save current config as template
                                </button>
                                {templates.map((t) => (
                                    <span key={t.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-container px-3 py-1 text-xs">
                                        <span>{t.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void fetch(`/admin/sessions/${session.id}/templates/${t.id}/apply`, {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        Accept: 'application/json',
                                                        'X-Admin-Token': adminToken,
                                                        'X-XSRF-TOKEN': decodeURIComponent(
                                                            document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                                        ),
                                                    },
                                                }).then((r) => {
 if (r.ok) {
refetch();
} 
});
                                            }}
                                            className="font-mono text-secondary hover:underline"
                                        >
                                            apply
                                        </button>
                                    </span>
                                ))}
                            </section>

                            {/* Recent Activity Log */}
                            <section className="glass-card mt-8 rounded-2xl p-5">
                                <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                                    Recent Session Activity
                                </h3>
                                <ul className="mt-3 space-y-1.5 text-xs text-on-surface-variant">
                                    {activity.length === 0 && <li className="italic text-on-surface-variant/40">No activity yet.</li>}
                                    {activity.slice(0, 15).map((e, i) => (
                                        <li key={i} className="flex items-center justify-between border-b border-white/5 py-1">
                                            <span className="font-medium text-on-surface capitalize">{e.type.replace(/_/g, ' ')}</span>
                                            <span className="font-mono text-[10px] text-on-surface-variant/60">
                                                {new Date(e.at).toLocaleTimeString()}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </>
                    )}
                </div>
            </main>

            {memberDialog && (
                <MemberActionDialog
                    action={memberDialog.action}
                    members={managedParticipants.filter((participant) => memberDialog.ids.includes(participant.id))}
                    groups={data.groups.map((group) => ({ id: group.id, name: group.name }))}
                    roles={roleNames}
                    onClose={() => {
                        if (!memberActionBusy) setMemberDialog(null);
                    }}
                    onConfirm={confirmMemberAction}
                />
            )}
            {/* Docked Pool Bottom Bar */}
            <footer className="glass-card fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 p-4 shadow-2xl backdrop-blur-xl lg:left-64">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
                    <div className="flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 hide-scrollbar sm:pb-0 sm:w-auto">
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                            Unassigned Pool ({data.pool.length}):
                        </span>
                        {data.pool.map((p) => (
                            <span
                                key={p.id}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#060e20] px-3 py-1 text-xs shadow-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedParticipantIds.includes(p.id)}
                                    onChange={() => toggleParticipant(p.id)}
                                    className="h-3.5 w-3.5 accent-primary"
                                    aria-label={`Select ${p.name}`}
                                />
                                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_#6dfc57]" />
                                <span className="font-medium text-on-surface">{p.name}</span>
                                {p.custom_role && <span className="font-mono text-[9px] text-secondary">{p.custom_role}</span>}
                                <button
                                    type="button"
                                    onClick={() => openMemberAction('move', [p.id])}
                                    className="rounded bg-surface-variant/60 px-1.5 py-0.5 font-mono text-[9px] text-on-surface-variant hover:text-secondary"
                                >
                                    move
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openMemberAction('role', [p.id])}
                                    disabled={roleNames.length === 0}
                                    className="rounded bg-surface-variant/60 px-1.5 py-0.5 font-mono text-[9px] text-on-surface-variant hover:text-secondary disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    role
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openMemberAction('ban', [p.id])}
                                    className="rounded bg-error-container/30 px-1.5 py-0.5 font-mono text-[9px] text-error hover:bg-error-container/50"
                                >
                                    ban
                                </button>
                            </span>
                        ))}
                        {data.pool.length === 0 && (
                            <span className="font-mono text-xs text-on-surface-variant/50">
                                {data.groups.length > 0 ? 'Everyone is grouped.' : 'The pool is empty.'}
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => act(`/admin/sessions/${session.id}/auto-distribute`)}
                        disabled={data.pool.length === 0}
                        className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary-container px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-black shadow-[0_0_15px_rgba(78,222,61,0.35)] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                        <span className="material-symbols-outlined text-[16px]">bolt</span>
                        <span>Auto-Distribute</span>
                    </button>
                </div>
            </footer>
        </div>
    );
}
