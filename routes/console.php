<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Session deadlines archive live sessions without facilitator intervention.
Schedule::command('sessions:archive-expired')->everyMinute();

// FR-1.7: archived sessions purge at their configured deadline.
Schedule::command('sessions:purge')->daily();

// CAP-10: sweep empty/leaderless groups
Schedule::command('sessions:purge-ghost-groups')->hourly();
// CAP-12: auto-dissolve timers
Schedule::command('sessions:auto-dissolve')->everyMinute();
