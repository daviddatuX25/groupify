<?php

namespace App\Services;

use App\Models\Group;
use App\Models\Membership;

/**
 * Keeps groups healthy after a membership removal (CAP-10): transfers
 * leadership to the oldest active member, or dissolves the group when empty.
 * Single implementation used by leave, force-move, ban, and the GC sweep.
 */
class GroupLeadershipService
{
    public const DISSOLVED = 'dissolved';

    public const TRANSFERRED = 'transferred';

    public const KEPT = 'kept';

    /**
     * Rebalance after a removal. The caller is responsible for broadcasts.
     *
     * @return self::*
     */
    public function rebalanceAfterRemoval(Group $group): string
    {
        $next = Membership::query()
            ->where('group_id', $group->id)
            ->where('status', 'active')
            ->orderBy('id')
            ->first();

        if ($next === null) {
            $group->delete();

            return self::DISSOLVED;
        }

        $leaderGone = $group->leader_id === null
            || ! Membership::query()
                ->where('group_id', $group->id)
                ->where('participant_id', $group->leader_id)
                ->where('status', 'active')
                ->exists();

        if ($leaderGone) {
            $group->update(['leader_id' => $next->participant_id]);
            $next->update(['role' => 'leader']);
            $group->unsetRelation('memberships');

            return self::TRANSFERRED;
        }

        return self::KEPT;
    }
}
