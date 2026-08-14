<?php

namespace App\Console\Commands;

use App\Events\MembershipChanged;
use App\Models\Membership;
use App\Models\Session;
use App\Services\EventRecorder;
use Illuminate\Console\Command;

/**
 * Auto-dissolve (CAP-12): when a session's dissolve_at passes, everyone returns
 * to the pool. Idempotent — after dissolving, dissolve_at is cleared.
 */
final class AutoDissolveSessions extends Command
{
    protected $signature = 'sessions:auto-dissolve';

    protected $description = 'Dissolve groups for sessions whose auto-dissolve timer expired';

    public function handle(EventRecorder $recorder): int
    {
        $now = now();

        $sessions = Session::query()
            ->whereIn('status', ['live', 'frozen'])
            ->whereNotNull('dissolve_at')
            ->where('dissolve_at', '<=', $now)
            ->get();

        foreach ($sessions as $session) {
            $affected = Membership::query()
                ->whereIn('group_id', $session->groups()->pluck('id'))
                ->where('status', 'active')
                ->count();

            Membership::query()
                ->whereIn('group_id', $session->groups()->pluck('id'))
                ->delete();

            $session->groups()->update(['leader_id' => null]);
            $session->update(['dissolve_at' => null]);

            if ($affected > 0) {
                broadcast(new MembershipChanged($session, 0, 'dissolved'))->toOthers();
                $recorder->record($session, 'auto_dissolved', ['affected' => $affected]);
            }
        }

        $this->info("Auto-dissolved {$sessions->count()} session(s).");

        return self::SUCCESS;
    }
}
