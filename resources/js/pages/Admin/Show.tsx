import { echo } from '@laravel/echo-react';
import ComingNext from '@/components/ComingNext';
import { Logo } from '@/components/Logo';
import ServerStatus from '@/components/ServerStatus';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

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

type Board = {
    code: string;
    status: string;
    presence: number;
    pool: { id: number; name: string }[];
    groups: Group[];
    config: { rules: Record<string, unknown> };
    is_admin: boolean;
};

const CHANNEL_EVENTS = ['SessionConfigUpdated', 'SessionStateUpdated', 'GroupCreated', 'MembershipChanged', 'SessionDeleted'];

export default function Show({ session }: { session: Board & { id: number; pin: string; admin_token?: string } }) {
    const [board, setBoard] = useState<Board | null>(null);
    const [ready, setReady] = useState(false);
    const [showJoinInfo, setShowJoinInfo] = useState(true);
    const [showBoard, setShowBoard] = useState(true);
    const [activity, setActivity] = useState<{ type: string; payload: Record<string, unknown>; at: string }[]>([]);
    const [timerMin, setTimerMin] = useState('');
    const [guestListText, setGuestListText] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [announceDraft, setAnnounceDraft] = useState('');
    const [roleName, setRoleName] = useState('');
    const [proxyNames, setProxyNames] = useState('');
    const [quizDraft, setQuizDraft] = useState([{ q: '', options: ['', '', '', ''], answer: 0, points: 10 }]);
    const [roleActions, setRoleActions] = useState('');
    const [modQueue, setModQueue] = useState<{ id: number; scope: string; author: string; body: string }[]>([]);
    const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
    const [liveCount, setLiveCount] = useState<number | null>(null);
    const [joinBase, setJoinBase] = useState('');

    // Persist the admin token from the server prop (AD-3); subsequent loads read it.
    if (typeof window !== 'undefined' && session.admin_token) {
        window.localStorage.setItem('groupify.admin_token', session.admin_token);
    }

    const adminToken =
        typeof window === 'undefined' ? '' : (window.localStorage.getItem('groupify.admin_token') ?? '');

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
                if (json) setBoard(json as Board);
            })
            .catch(() => setActionError('Board sync failed — reconnecting…'));
        fetch(`/admin/sessions/${session.id}/activity`, { headers: { 'X-Admin-Token': adminToken } })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                if (json) setActivity(json.events);
            })
            .catch(() => {});
        fetch(`/admin/sessions/${session.id}/messages/pending`, { headers: { 'X-Admin-Token': adminToken } })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => { if (json) setModQueue(json.messages); })
            .catch(() => {});
        fetch(`/admin/sessions/${session.id}/templates`, { headers: { 'X-Admin-Token': adminToken } })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                if (json) setTemplates(json.templates);
            })
            .catch(() => {});
    };

    // QR drawn on mount + whenever the canvas (re)mounts (F3: toggling join
    // info destroyed the canvas and the effect never re-ran).
    const qrRef = (node: HTMLCanvasElement | null) => {
        if (node && data.code) {
            const base = joinBase || window.location.origin;
            void QRCode.toCanvas(node, `${base}/join/${data.code}`, {
                width: 160,
                margin: 1,
                color: { dark: '#0e1511', light: '#ffffff' },
            });
        }
    };

    // Persist token (AD-3) + live subscription (AD-6)
    useEffect(() => {
        try {
            if (typeof window === 'undefined') return;
            window.localStorage.setItem('groupify.admin_token', adminToken);
            const channel = echo().channel(`session.${data.code}`);
            CHANNEL_EVENTS.forEach((ev) => channel.listen(ev, refetch));

            const presence = echo().join(`session.${data.code}`) // Echo prepends the presence- prefix itself;
            presence.here((members: unknown[]) => setLiveCount(members.length));
            presence.joining(() => setLiveCount((c) => (c === null ? c : c + 1)));
            presence.leaving(() => setLiveCount((c) => (c === null ? c : Math.max(0, c - 1))));
            setReady(true);
            return () => {
                CHANNEL_EVENTS.forEach((ev) => channel.stopListening(ev));
                echo().leaveChannel(`session.${data.code}`);
                presence.leave();
            };
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[Admin/Show] effect failed', err);
            window.__adminEffectError = String(err);
            setReady(true); // render so the error is visible in the page
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.code, adminToken]);

    const act = (url: string, payload: Record<string, unknown> = {}) => {
        const xsrf = document.cookie
            .split('; ')
            .find((c) => c.startsWith('XSRF-TOKEN='))
            ?.split('=')[1];
        void fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Admin-Token': adminToken,
                ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {}),
            },
            body: JSON.stringify(payload),
        }).then((r) => {
            if (r.ok) refetch();
        });
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

    // 3-7: projection hotkeys — i toggles join info, h hides the board (Mentimeter pattern)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable)) return;
            if (e.key === 'i') setShowJoinInfo((v) => !v);
            if (e.key === 'h') setShowBoard((v) => !v);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (!ready) return null;

    const frozen = data.config.rules.freeze as boolean;
    const topicsSet = data.groups.filter((g) => Object.values(g.field_values).some((v) => v)).length;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto w-full max-w-7xl px-6 py-8">
                {actionError && (
                    <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-300">
                        {actionError}
                    </div>
                )}
                <ServerStatus />
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
                            <Logo className="h-8 w-8" />
                            Groupify Admin
                        </h1>
                        <p className="mt-0.5 text-xs uppercase tracking-widest text-slate-500">
                            Live session control panel · {data.status}
                            {frozen ? ' · FROZEN' : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                            {(liveCount ?? data.presence)} online
                        </span>
                        <span className="font-mono text-cyan-300">PIN: {session.pin}</span>
                    </div>
                </header>

                {showJoinInfo && (
                <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-12">
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900 p-5 md:col-span-3">
                        <canvas key={joinBase} ref={qrRef} className="h-36 w-36 rounded-lg bg-white p-2" />
                        <p className="mt-3 text-xs uppercase tracking-widest text-slate-400">Scan to join</p>
                        <p className="mt-1 font-mono text-lg font-bold tracking-widest text-cyan-400">{data.code}</p>
                        <input
                            type="text"
                            value={joinBase}
                            onChange={(e) => setJoinBase(e.target.value)}
                            placeholder={typeof window !== 'undefined' ? window.location.origin : ''}
                            className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-center font-mono text-xs text-slate-300 outline-none focus:border-cyan-400"
                            title="Join URL for phones on your network (localhost means the phone itself — use your computer's LAN IP)"
                        />
                        <p className="mt-1 text-center text-[10px] text-slate-600">
                            If phones can't scan: replace localhost with this computer's LAN IP (e.g. 192.168.1.20:8081)
                        </p>
                    </div>

                    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900 p-5 md:col-span-9">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    type="number"
                                    min={1}
                                    placeholder="Auto-dissolve (min)"
                                    value={timerMin}
                                    onChange={(e) => setTimerMin(e.target.value)}
                                    className="w-44 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Guest list (comma-separated)"
                                    value={guestListText}
                                    onChange={(e) => setGuestListText(e.target.value)}
                                    className="w-56 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                                />
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
                                        }).then((r) => { if (r.ok) { refetch(); setGuestListText(''); } });
                                    }}
                                    className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                                >
                                    Set guest list
                                </button>
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
                                        }).then((r) => { if (r.ok) { refetch(); setTimerMin(''); } });
                                    }}
                                    className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                                >
                                    Set timer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => patchState(frozen ? 'unfreeze' : 'freeze')}
                                    className={`rounded-lg border px-4 py-2 text-sm ${
                                        frozen
                                            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                                            : 'border-rose-400/40 bg-rose-400/10 text-rose-300'
                                    }`}
                                >
                                    {frozen ? 'Unfreeze' : 'Freeze'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => act(`/admin/sessions/${session.id}/dissolve`)}
                                    className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm text-rose-300"
                                >
                                    Dissolve all
                                </button>
                            </div>
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 sm:grid-cols-4">
                            {[
                                ['PIN', session.pin, 'text-cyan-300'],
                                ['Topics set', `${topicsSet}/${data.groups.length}`, 'text-cyan-400'],
                                ['In pool', `${data.pool.length}`, 'text-slate-100'],
                                ['Groups', `${data.groups.length}`, 'text-slate-100'],
                            ].map(([label, value, color]) => (
                                <div key={label as string}>
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
                                    <p className={`mt-0.5 text-2xl font-extrabold ${color}`}>{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                )}

                {/* Live groups */}
                {showBoard && (
                <>
                <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-slate-400">Live groups</h2>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {data.groups.map((g) => (
                        <article key={g.id} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <h3 className="font-bold">{g.name}</h3>
                                <div className="flex gap-1">
                                    {Array.from({ length: g.capacity }).map((_, i) => (
                                        <span
                                            key={i}
                                            className={`h-2 w-2 rounded-full ${
                                                i < g.member_count
                                                    ? 'bg-cyan-400 shadow-[0_0_6px_#06B6D4]'
                                                    : 'border border-white/20'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <ul className="mt-2 space-y-1 text-sm">
                                {g.members.map((m) => (
                                    <li key={m.id} className="flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-2">
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    m.role === 'leader' ? 'bg-emerald-400' : 'bg-slate-600'
                                                }`}
                                            />
                                            {m.name}
                                            {m.role === 'leader' && (
                                                <span className="text-xs text-emerald-400">lead</span>
                                            )}
                                        </span>
                                        <select
                                            className="rounded bg-slate-950 px-1 py-0.5 text-xs text-slate-400 outline-none"
                                            defaultValue=""
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                if (v === '') return;
                                                if (v === 'pool') {
                                                    act(`/admin/sessions/${session.id}/members/${m.id}/move`, {
                                                        to_group_id: null,
                                                    });
                                                } else {
                                                    act(`/admin/sessions/${session.id}/members/${m.id}/move`, {
                                                        to_group_id: Number(v),
                                                    });
                                                }
                                            }}
                                        >
                                            <option value="">move…</option>
                                            <option value="pool">to pool</option>
                                            {data.groups
                                                .filter((o) => o.id !== g.id)
                                                .map((o) => (
                                                    <option key={o.id} value={o.id}>
                                                        to {o.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </li>
                                ))}
                            </ul>
                            <button
                                type="button"
                                onClick={() => act(`/admin/sessions/${session.id}/dissolve`, { group_id: g.id })}
                                className="mt-3 w-full rounded-lg border border-white/10 py-1.5 text-xs text-slate-400 hover:border-rose-400/40 hover:text-rose-300"
                            >
                                Dissolve this group
                            </button>
                        </article>
                    ))}
                    {data.groups.length === 0 && (
                        <p className="text-sm text-slate-500">No groups yet — participants will create them.</p>
                    )}
                </div>

                {/* Pool */}
                <div className="mt-8 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                        Unassigned pool ({data.pool.length})
                    </h2>
                    <button
                        type="button"
                        onClick={() => act(`/admin/sessions/${session.id}/auto-distribute`)}
                        disabled={data.pool.length === 0}
                        className="rounded-lg bg-cyan-400 px-4 py-1.5 text-xs font-bold text-deep-ink transition hover:bg-cyan-300 disabled:opacity-40"
                    >
                        ⚡ Auto-Distribute
                    </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {data.pool.map((p) => (
                        <span
                            key={p.id}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-sm"
                        >
                            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#4edea3]" />
                            {p.name}
                            <button
                                type="button"
                                onClick={() =>
                                    act(`/admin/sessions/${session.id}/members/${p.id}/ban`, { banned: true })
                                }
                                className="rounded bg-rose-400/15 px-1.5 py-0.5 text-[10px] text-rose-300"
                            >
                                ban
                            </button>
                            <select
                                className="rounded bg-slate-950 px-1 py-0.5 text-xs text-slate-400 outline-none"
                                value={p.custom_role ?? ''}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    void fetch(`/admin/sessions/${session.id}/members/${p.id}/role`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            Accept: 'application/json',
                                            'X-Admin-Token': adminToken,
                                            'X-XSRF-TOKEN': decodeURIComponent(
                                                document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                            ),
                                        },
                                        body: JSON.stringify({ role: v === '' ? null : v }),
                                    }).then((r) => { if (r.ok) refetch(); });
                                }}
                            >
                                <option value="">role…</option>
                                {Object.keys((data.config.roles ?? {}) as Record<string, string[]>).map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </span>
                    ))}
                    {data.pool.length === 0 &&
                        (data.groups.length > 0 ? (
                            <p className="text-sm text-slate-500">Everyone is grouped.</p>
                        ) : (
                            <p className="text-sm text-slate-500">The pool is empty — no participants yet.</p>
                        ))}
                </div>

                {/* Pending requests across groups (phase-2 A completion) */}
                {data.groups.some((g) => (g as Group & { pending?: { id: number; name: string }[] }).pending?.length) && (
                    <div className="mt-8 rounded-2xl border border-cyan-400/20 bg-slate-900 p-4">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-cyan-400">Pending requests</h2>
                        {data.groups.map((g) =>
                            (g as Group & { pending?: { id: number; name: string }[] }).pending?.map((p) => (
                                <div key={p.id} className="mt-2 flex items-center justify-between text-sm">
                                    <span>
                                        {p.name} → <span className="text-slate-400">{g.name}</span>
                                    </span>
                                    <span className="flex gap-2">
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
                                                }).then((r) => { if (r.ok) refetch(); })
                                            }
                                            className="rounded bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300"
                                        >
                                            approve
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
                                                }).then((r) => { if (r.ok) refetch(); })
                                            }
                                            className="rounded bg-rose-400/15 px-2 py-0.5 text-xs text-rose-300"
                                        >
                                            reject
                                        </button>
                                    </span>
                                </div>
                            )),
                        )}
                    </div>
                )}

                {data.config.rules.chat_enabled && (
                    <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-4">
                        <p className="text-sm font-bold uppercase tracking-wide text-cyan-400">Announcements</p>
                        <div className="mt-2 flex gap-2">
                            <input
                                type="text"
                                placeholder="Announce to everyone…"
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
                                        }).then((r) => { if (r.ok) refetch(); });
                                    }
                                }}
                                className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                            />
                        </div>
                    </div>
                )}

                {/* Quiz extension (phase-2 M) */}
                <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <span className="text-sm font-bold uppercase tracking-wide text-slate-400">Quiz</span>
                            {data.quiz && (
                                <p className="mt-1 text-xs text-slate-500">
                                    {data.quiz.status === 'live' && `Live · Q${data.quiz.current_index + 1}/${data.quiz.total}`}
                                    {data.quiz.status === 'done' && 'Finished'}
                                    {data.quiz.status === 'live' && ' · leaderboard:'}
                                    {data.quiz && data.quiz.leaderboard?.slice(0, 3).map((l: { name: string; points: number }) => (
                                        <span key={l.name} className="ml-1">
                                            {l.name} {l.points}
                                        </span>
                                    ))}
                                </p>
                            )}
                        </div>
                        {data.quiz?.status === 'live' && (
                            <button
                                type="button"
                                onClick={() => act(`/admin/sessions/${session.id}/quiz/start`)}
                                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                                disabled
                            >
                                running…
                            </button>
                        )}
                        {(!data.quiz || data.quiz.status === 'done') && (
                            <button
                                type="button"
                                onClick={() => act(`/admin/sessions/${session.id}/quiz/start`)}
                                className="rounded-lg bg-cyan-400/15 px-3 py-1.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/25"
                            >
                                Start quiz
                            </button>
                        )}
                    </div>
                    {(!data.quiz || data.quiz.status === 'done') && (
                        <div className="mt-3 space-y-2">
                            {quizDraft.map((qq, qi) => (
                                <div key={qi} className="rounded-lg border border-white/10 bg-slate-950 p-3">
                                    <div className="flex gap-2">
                                        <input
                                            value={qq.q}
                                            onChange={(e) =>
                                                setQuizDraft((d) => d.map((x, i) => (i === qi ? { ...x, q: e.target.value } : x)))
                                            }
                                            placeholder={`Question ${qi + 1}`}
                                            className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm outline-none focus:border-cyan-400"
                                        />
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={qq.points}
                                            onChange={(e) =>
                                                setQuizDraft((d) => d.map((x, i) => (i === qi ? { ...x, points: Number(e.target.value) } : x)))
                                            }
                                            className="w-20 rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm outline-none focus:border-cyan-400"
                                            aria-label="points"
                                        />
                                        <span className="text-xs text-slate-500">pts</span>
                                        <button
                                            type="button"
                                            onClick={() => setQuizDraft((d) => d.filter((_, i) => i !== qi))}
                                            className="rounded bg-rose-400/15 px-2 text-xs text-rose-300"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    {qq.options.map((opt, oi) => (
                                        <div key={oi} className="mt-1 flex items-center gap-2">
                                            <button
                                                type="button"
                                                role="radio"
                                                aria-checked={qq.answer === oi}
                                                aria-label={`correct answer ${oi + 1}`}
                                                onClick={() => setQuizDraft((d) => d.map((x, i) => (i === qi ? { ...x, answer: oi } : x)))}
                                                className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                                                    qq.answer === oi ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600 bg-transparent'
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
                                                placeholder={`Option ${oi + 1}`}
                                                className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-sm outline-none focus:border-cyan-400"
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setQuizDraft((d) => [...d, { q: '', options: ['', '', '', ''], answer: 0, points: 10 }])}
                                    className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                                >
                                    + question
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
                                        })
                                    }
                                    className="rounded-lg bg-cyan-400/15 px-4 py-1.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/25"
                                >
                                    Save quiz
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Proxy mode (phase-2 L) */}
                <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900 p-4">
                    <span className="text-sm font-bold uppercase tracking-wide text-slate-400">Proxy importer</span>
                    <p className="mt-1 text-xs text-slate-500">
                        Add people who are not present (field trips): one name per line. They join later and claim their seat.
                    </p>
                    <div className="mt-3 flex gap-2">
                        <textarea
                            value={proxyNames}
                            onChange={(e) => setProxyNames(e.target.value)}
                            rows={4}
                            placeholder={'Ana\nBen\nCai'}
                            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const names = proxyNames.split('\n').map((n) => n.trim()).filter(Boolean);
                                if (!names.length) return;
                                act(`/admin/sessions/${session.id}/participants`, { names });
                            }}
                            className="h-fit rounded-lg bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/25"
                        >
                            Create seats
                        </button>
                    </div>
                </div>

                {/* Custom roles (phase-2 J) */}
                <div className="mt-8 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 p-4">
                    <span className="text-sm font-bold uppercase tracking-wide text-slate-400">Roles</span>
                    <input
                        type="text"
                        placeholder="role name"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        className="w-32 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-sm outline-none focus:border-cyan-400"
                    />
                    <input
                        type="text"
                        placeholder="actions (comma)"
                        value={roleActions}
                        onChange={(e) => setRoleActions(e.target.value)}
                        className="w-64 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-sm outline-none focus:border-cyan-400"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            const name = roleName.trim();
                            const actions = roleActions.split(',').map((a) => a.trim()).filter(Boolean);
                            if (!name) return;
                            const roles = (data.config.roles ?? {}) as Record<string, string[]>;
                            roles[name] = actions;
                            void fetch(`/admin/sessions/${session.id}/config`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Accept: 'application/json',
                                    'X-Admin-Token': adminToken,
                                    'X-XSRF-TOKEN': decodeURIComponent(
                                        document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? ''
                                    ),
                                },
                                body: JSON.stringify({ roles }),
                            }).then((r) => { if (r.ok) { setRoleName(''); setRoleActions(''); refetch(); } });
                        }}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                    >
                        Define role
                    </button>
                    {Object.entries((data.config.roles ?? {}) as Record<string, string[]>).map(([name, actions]) => (
                        <span key={name} className="rounded-full border border-cyan-400/20 bg-slate-950 px-3 py-1 text-xs text-cyan-300">
                            {name}: {actions.join(', ')}
                        </span>
                    ))}
                </div>

                {modQueue.length > 0 && (
                    <div className="mt-8 rounded-2xl border border-amber-400/20 bg-slate-900 p-4">
                        <p className="text-sm font-bold uppercase tracking-wide text-amber-300">
                            Moderation queue ({modQueue.length})
                        </p>
                        {modQueue.map((m) => (
                            <div key={m.id} className="mt-2 flex items-center justify-between gap-3 text-sm">
                                <span className="truncate">
                                    <span className="text-slate-400">{m.author}:</span> {m.body}
                                </span>
                                <span className="flex shrink-0 gap-2">
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
                                            }).then((r) => { if (r.ok) refetch(); });
                                        }}
                                        className="rounded bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300"
                                    >
                                        approve
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
                                            }).then((r) => { if (r.ok) refetch(); });
                                        }}
                                        className="rounded bg-rose-400/15 px-2 py-0.5 text-xs text-rose-300"
                                    >
                                        reject
                                    </button>
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Session templates (phase-2 F) */}
                <div className="mt-8 flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        placeholder="Template name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-44 rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-cyan-400"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            const name = templateName.trim();
                            if (!name) return;
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
                            }).then((r) => { if (r.ok) { setTemplateName(''); refetch(); } });
                        }}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
                    >
                        Save current config as template
                    </button>
                    {templates.map((t) => (
                        <span key={t.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs">
                            {t.name}
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
                                    }).then((r) => { if (r.ok) refetch(); });
                                }}
                                className="text-cyan-400 hover:text-cyan-300"
                            >
                                apply
                            </button>
                        </span>
                    ))}
                </div>

                {/* Activity feed (3-6) */}
                <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-slate-400">Recent activity</h2>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
                    {activity.length === 0 && <li className="text-slate-600">No activity yet.</li>}
                    {activity.slice(0, 15).map((e, i) => (
                        <li key={i} className="flex justify-between gap-4">
                            <span>{e.type.replace(/_/g, ' ')}</span>
                            <span className="font-mono text-xs text-slate-600">
                                {new Date(e.at).toLocaleTimeString()}
                            </span>
                        </li>
                    ))}
                </ul>
                </>
                )}
            </div>
            <ComingNext />
        </main>
    );
}
