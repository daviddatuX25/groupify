<?php

namespace App\Services;

use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;

/**
 * One server-computed snapshot of a session's live board (CAP-3).
 * AD-6: clients render from this snapshot and resync on reconnect.
 */
class SessionSnapshot
{
    /**
     * @return array<string, mixed>
     */
    public function build(Session $session, ?Participant $me): array
    {
        $groups = $session->groups()
            ->withCount(['memberships as member_count' => fn ($q) => $q->where('status', 'active')])
            ->orderBy('name')
            ->get();

        $groupIds = $groups->pluck('id');
        $activeMemberIds = Membership::query()
            ->whereIn('group_id', $groupIds)
            ->where('status', 'active')
            ->pluck('participant_id');

        $pool = Participant::query()
            ->where('group_session_id', $session->id)
            ->whereNotIn('id', $activeMemberIds)
            ->orderBy('name')
            ->get(['id', 'name']);

        return [
            'code' => $session->code,
            'status' => $session->status,
            'config' => $session->config->toArray(),
            'presence' => Participant::query()->where('group_session_id', $session->id)->count(),
            'pool' => $pool->values(),
            'groups' => $groups->map(fn (Group $group) => [
                'id' => $group->id,
                'name' => $group->name,
                'leader_id' => $group->leader_id,
                'member_count' => (int) $group->member_count,
                'capacity' => $group->effectiveCapacity($session),
                'open_slots' => $group->openSlots($session),
                'field_values' => $group->field_values,
                'members' => $group->memberships()
                    ->with('participant')
                    ->where('status', 'active')
                    ->get()
                    ->map(fn (Membership $m) => [
                        'id' => $m->participant_id,
                        'name' => $m->participant->name,
                        'role' => $m->role,
                    ])
                    ->values(),
            ])->values(),
            'me' => $me === null ? null : [
                'id' => $me->id,
                'name' => $me->name,
                'pooled' => ! $activeMemberIds->contains($me->id),
            ],
        ];
    }
}
