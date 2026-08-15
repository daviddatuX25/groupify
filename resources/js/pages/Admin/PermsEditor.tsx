import { useState } from 'react';
import MemberActionDialog from '@/components/MemberActionDialog';

type Participant = {
    id: number;
    name: string;
    role?: string;
    custom_role?: string | null;
};

type Props = {
    sessionId: number;
    code: string;
    adminToken: string;
    actions: string[];
    defaults: Record<string, Record<string, boolean>>;
    perms: Record<string, Record<string, boolean>>;
    roles: Record<string, string[]>;
    participants: Participant[];
    onSaved: () => void;
};

const ROLES = ['admin', 'leader', 'member'] as const;
const ROLE_LABEL: Record<(typeof ROLES)[number], string> = {
    admin: 'Admin',
    leader: 'Leader',
    member: 'Member',
};

/**
 * Permission gates assignment (flexibility-model.md §1): the action × role
 * matrix overrides the system defaults, plus custom session roles.
 */
export default function PermsEditor({ sessionId, code, adminToken, actions, defaults, perms, roles, participants, onSaved }: Props) {
    const [overrides, setOverrides] = useState<Record<string, Record<string, boolean>>>({ ...perms });
    const [roleName, setRoleName] = useState('');
    const [roleActions, setRoleActions] = useState('');
    const [assignmentParticipant, setAssignmentParticipant] = useState<Participant | null>(null);
    const effective = (action: string, role: string): boolean =>
        overrides[action]?.[role] ?? defaults[action]?.[role] ?? false;

    const toggle = (action: string, role: string) => {
        const current = effective(action, role);
        setOverrides((o) => {
            const next = { ...o };
            next[action] = { ...(next[action] ?? {}), [role]: !current };

            return next;
        });
    };

    const savePerms = () => {
        const xsrf = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1];
        void fetch(`/admin/sessions/${sessionId}/config`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Admin-Token': adminToken,
                ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {}),
            },
            body: JSON.stringify({ perms: overrides }),
        }).then((r) => {
            if (r.ok) {
onSaved();
}
        });
    };

    const defineRole = () => {
        const name = roleName.trim();
        const actionsList = roleActions.split(',').map((a) => a.trim()).filter(Boolean);

        if (!name) {
return;
}

        const xsrf = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1];
        void fetch(`/admin/sessions/${sessionId}/config`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Admin-Token': adminToken,
                ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {}),
            },
            body: JSON.stringify({ roles: { ...roles, [name]: actionsList } }),
        }).then((r) => {
            if (r.ok) {
                setRoleName('');
                setRoleActions('');
                onSaved();
            }
        });
    };
    const assignRole = (participantId: number, role: string) => {
        const xsrf = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1];
        void fetch(`/admin/sessions/${sessionId}/members/${participantId}/role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Admin-Token': adminToken,
                ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf) } : {}),
            },
            body: JSON.stringify({ role: role || null }),
        }).then((r) => {
            if (r.ok) {
onSaved();
}
        });
    };

    return (
        <div className="space-y-6">
            {/* ---- Permission matrix ---- */}
            <section className="glass-card rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                        <h3 className="font-display text-base font-bold text-on-surface">Permission Gates</h3>
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                            Toggle what each role may do. Overrides the system defaults for this session.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={savePerms}
                        className="rounded-xl bg-primary-container px-4 py-2 font-display text-xs font-bold text-on-primary-container shadow-[0_0_15px_rgba(78,222,61,0.25)] hover:brightness-110"
                    >
                        Save Permissions
                    </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="pb-2 pr-3 font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                                    Action
                                </th>
                                {ROLES.map((r) => (
                                    <th key={r} className="pb-2 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                                        {ROLE_LABEL[r]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {actions.map((action) => (
                                <tr key={action} className="border-b border-white/5">
                                    <td className="py-2.5 pr-3 font-mono text-xs text-on-surface">{action}</td>
                                    {ROLES.map((role) => {
                                        const on = effective(action, role);

                                        return (
                                            <td key={role} className="py-2.5 text-center">
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={on}
                                                    aria-label={`${action} for ${ROLE_LABEL[role]}`}
                                                    onClick={() => toggle(action, role)}
                                                    className={`relative h-5 w-9 rounded-full transition-colors ${
                                                        on ? 'bg-primary-container' : 'bg-surface-variant'
                                                    }`}
                                                >
                                                    <span
                                                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                                                            on ? 'left-4' : 'left-0.5'
                                                        }`}
                                                    />
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ---- Custom session roles ---- */}
            <section className="glass-card rounded-2xl p-5 shadow-xl">
                <div className="border-b border-white/10 pb-3">
                    <h3 className="font-display text-base font-bold text-on-surface">Custom Roles</h3>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                        Session-scoped roles with additive action grants (e.g. a co-host who can announce).
                    </p>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-2.5">
                    <label className="flex flex-col gap-1">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Role name</span>
                        <input
                            type="text"
                            aria-label="Role name"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            className="w-36 rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Action grants</span>
                        <input
                            type="text"
                            aria-label="Action grants"
                            value={roleActions}
                            onChange={(e) => setRoleActions(e.target.value)}
                            className="w-72 rounded-xl border border-white/10 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface outline-none focus:border-secondary"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={defineRole}
                        className="rounded-xl border border-white/10 bg-surface-variant/40 px-4 py-2 font-sans text-xs font-semibold text-on-surface hover:bg-surface-variant"
                    >
                        Define Role
                    </button>
                    {Object.entries(roles).map(([name, roleActionList]) => (
                        <span key={name} className="rounded-full border border-secondary/30 bg-surface-container px-3 py-1 font-mono text-xs text-secondary">
                            {name}: {roleActionList.join(', ')}
                        </span>
                    ))}
                </div>

                <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                    Participants on this session: {code}
                </p>
            </section>
            <section className="glass-card rounded-2xl p-5 shadow-xl">
                <div className="border-b border-white/10 pb-3">
                    <h3 className="font-display text-base font-bold text-on-surface">Assign to participants</h3>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                        Custom grants apply in addition to each participant’s base role. Clear a role to restore the base permissions only.
                    </p>
                </div>
                {Object.keys(roles).length === 0 ? (
                    <p className="mt-4 rounded-xl border border-white/10 bg-surface-container-lowest p-4 text-xs text-on-surface-variant">
                        Define a custom role above before assigning one.
                    </p>
                ) : (
                    <div className="mt-4 space-y-2">
                        {participants.map((participant) => (
                            <div key={participant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-container-lowest p-3">
                                <div>
                                    <p className="text-xs font-semibold text-on-surface">{participant.name}</p>
                                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                                        base: {participant.role ?? 'member'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-lg border border-white/10 bg-surface-container px-2.5 py-2 text-xs text-on-surface-variant">
                                        {participant.custom_role ?? 'No custom role'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setAssignmentParticipant(participant)}
                                        disabled={Object.keys(roles).length === 0}
                                        className="rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2 text-xs font-semibold text-secondary hover:bg-secondary/20 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Assign role
                                    </button>
                                </div>
                            </div>
                        ))}
                        {participants.length === 0 && <p className="py-6 text-center text-xs text-on-surface-variant/60">Participants will appear here after they join.</p>}
                    </div>
                )}
            </section>
        {assignmentParticipant && (
            <MemberActionDialog
                action="role"
                members={[{ id: assignmentParticipant.id, name: assignmentParticipant.name, groupName: 'Participant' }]}
                groups={[]}
                roles={Object.keys(roles)}
                initialValue={assignmentParticipant.custom_role ?? ''}
                onClose={() => setAssignmentParticipant(null)}
                onConfirm={(role) => {
                    assignRole(assignmentParticipant.id, role);
                    setAssignmentParticipant(null);
                }}
            />
        )}
        </div>
    );
}
