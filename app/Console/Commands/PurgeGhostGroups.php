<?php

namespace App\Console\Commands;

use App\Models\Group;
use App\Models\Session;
use App\Services\GroupLeadershipService;
use Illuminate\Console\Command;

/**
 * GC sweep (CAP-10): dissolve empty groups and rebalance leaderless ones.
 * Runs hourly as a safety net — the live paths already rebalance on removal.
 */
class PurgeGhostGroups extends Command
{
    protected $signature = 'sessions:purge-ghost-groups';

    protected $description = 'Dissolve empty groups and transfer leadership out of leaderless groups';

    public function handle(GroupLeadershipService $service): int
    {
        $groups = Group::query()
            ->whereIn('group_session_id', Session::query()->whereIn('status', ['live', 'frozen'])->select('id'))
            ->get();

        $dissolved = 0;
        $transferred = 0;

        foreach ($groups as $group) {
            $hasMembers = $group->memberships()->where('status', 'active')->exists();

            if (! $hasMembers) {
                $group->delete();
                $dissolved++;

                continue;
            }

            if ($service->rebalanceAfterRemoval($group) === GroupLeadershipService::TRANSFERRED) {
                $transferred++;
            }
        }

        $this->info("Ghost groups: {$dissolved} dissolved, {$transferred} rebalanced.");

        return self::SUCCESS;
    }
}
