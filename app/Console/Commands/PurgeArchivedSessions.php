<?php

namespace App\Console\Commands;

use App\Models\Session;
use Illuminate\Console\Command;

/**
 * FR-1.7: archived sessions purge at their configured deadline (daily).
 * Deletion is the full token-revocation path (AD-3); participants cascade.
 */
final class PurgeArchivedSessions extends Command
{
    protected $signature = 'sessions:purge';

    protected $description = 'Delete archived sessions older than 30 days';

    public function handle(): int
    {
        $count = Session::query()
            ->where('status', 'archived')
            ->whereNotNull('purge_at')
            ->where('purge_at', '<=', now())
            ->delete();

        $this->info("Purged {$count} archived session(s).");

        return self::SUCCESS;
    }
}
