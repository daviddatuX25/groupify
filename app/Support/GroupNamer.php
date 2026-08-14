<?php

namespace App\Support;

use App\Models\Group;
use App\Models\Session;

/**
 * Sequential group naming (FR-4.1): 'alpha' → Team Alpha/Bravo/…/Z, then AA…
 * 'table' → Table 1, 2, …
 */
final class GroupNamer
{
    public static function next(Session $session): string
    {
        $count = Group::query()->where('group_session_id', $session->id)->count();
        $naming = $session->config->rules()['naming'] ?? 'alpha';

        if ($naming === 'table') {
            return 'Table '.($count + 1);
        }

        $n = $count;
        $words = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu'];
        $round = intdiv($n, count($words));
        $word = $words[$n % count($words)];

        return 'Team '.$word.($round > 0 ? ' '.($round + 1) : '');
    }
}
