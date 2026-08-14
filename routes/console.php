<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// FR-1.7: archived sessions auto-purge after 30 days
Schedule::command('sessions:purge')->daily();

// CAP-10: sweep empty/leaderless groups
Schedule::command('sessions:purge-ghost-groups')->hourly();
// CAP-12: auto-dissolve timers
Schedule::command('sessions:auto-dissolve')->everyMinute();
