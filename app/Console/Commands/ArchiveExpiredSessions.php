<?php

namespace App\Console\Commands;

use App\Events\SessionStateUpdated;
use App\Models\Session;
use App\Services\EventRecorder;
use App\Services\SessionLifecycleService;
use Illuminate\Console\Command;

final class ArchiveExpiredSessions extends Command
{
    protected $signature = 'sessions:archive-expired';

    protected $description = 'Archive live sessions whose end deadline has passed';

    public function handle(SessionLifecycleService $lifecycle, EventRecorder $recorder): int
    {
        $sessions = Session::query()
            ->whereIn('status', ['live', 'frozen'])
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->get();

        foreach ($sessions as $session) {
            if (! $lifecycle->archive($session)) {
                continue;
            }

            broadcast(new SessionStateUpdated($session))->toOthers();
            $recorder->record($session, 'session_archived', ['automatic' => true]);
        }

        $this->info("Archived {$sessions->count()} expired session(s).");

        return self::SUCCESS;
    }
}
