import { echo } from '@laravel/echo-react';
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

    // Persist the admin token from the server prop (AD-3); subsequent loads read it.
    if (typeof window !== 'undefined' && session.admin_token) {
        window.localStorage.setItem('groupify.admin_token', session.admin_token);
    }

    const adminToken =
        typeof window === 'undefined' ? '' : (window.localStorage.getItem('groupify.admin_token') ?? '');

    const data = board ?? session;

    const refetch = () => {
        fetch(`/api/sessions/${data.code}/board`, { headers: { 'X-Admin-Token': adminToken } })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                if (json) setBoard(json as Board);
            });
    };

    // Persist token (AD-3) + live subscription (AD-6) + QR
    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('groupify.admin_token', adminToken);
        const url = `${window.location.origin}/join/${data.code}`;
        const canvas = document.querySelector('canvas');
        if (canvas) {
            void QRCode.toCanvas(canvas, url, { width: 160, margin: 1, color: { dark: '#0e1511', light: '#ffffff' } });
        }
        const channel = echo().channel(`session.${data.code}`);
        CHANNEL_EVENTS.forEach((ev) => channel.listen(ev, refetch));
        setReady(true);
        return () => {
            CHANNEL_EVENTS.forEach((ev) => channel.stopListening(ev));
            echo().leaveChannel(`session.${data.code}`);
        };
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
        }).then((r) => {
            if (r.ok) refetch();
        });
    };

    if (!ready) return null;

    const frozen = data.config.rules.freeze as boolean;
    const topicsSet = data.groups.filter((g) => Object.values(g.field_values).some((v) => v)).length;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto w-full max-w-7xl px-6 py-8">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight">Groupify Admin</h1>
                        <p className="mt-0.5 text-xs uppercase tracking-widest text-slate-500">
                            Live session control panel · {data.status}
                            {frozen ? ' · FROZEN' : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                            {data.presence} online
                        </span>
                        <span className="font-mono text-rose-400">PIN: {session.pin}</span>
                    </div>
                </header>

                {/* Bento: QR + stats + controls */}
                <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-12">
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900 p-5 md:col-span-3">
                        <canvas className="h-36 w-36 rounded-lg bg-white p-2" />
                        <p className="mt-3 text-xs uppercase tracking-widest text-slate-400">Scan to join</p>
                        <p className="mt-1 font-mono text-lg font-bold tracking-widest text-cyan-400">{data.code}</p>
                    </div>

                    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900 p-5 md:col-span-9">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex gap-2">
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
                                ['PIN', session.pin, 'text-rose-400'],
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

                {/* Live groups */}
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
                <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-slate-400">
                    Unassigned pool ({data.pool.length})
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                    {data.pool.map((p) => (
                        <span
                            key={p.id}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-sm"
                        >
                            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#4edea3]" />
                            {p.name}
                        </span>
                    ))}
                    {data.pool.length === 0 && <p className="text-sm text-slate-500">Everyone is grouped.</p>}
                </div>
            </div>
        </main>
    );
}
