<?php

namespace App\Console\Commands;

use App\Models\Session;
use Illuminate\Console\Command;

/**
 * FR-1.7: archived sessions auto-purge after 30 days (daily).
 * Deletion is the full token-revocation path (AD-3); participants cascade.
 */
final class PurgeArchivedSessions extends Command
{
    protected $signature = 'sessions:purge';

    protected $description = 'Delete archived sessions older than 30 days';

    public function handle(): int
    {
        $cutoff = now()->subDays(30);

        $count = Session::query()
            ->where('status', 'archived')
            ->where('updated_at', '<', $cutoff)
            ->delete();

        $this->info("Purged {$count} archived session(s).");

        return self::SUCCESS;
    }
}
