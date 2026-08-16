<?php

namespace App\Support;

use App\Models\Group;
use App\Models\Session;

/**
 * Sequential group naming (FR-4.1): 'alpha' → Team Alpha/Bravo/…/Z, then AA…
 * 'table' → Table 1, 2, … Random batch names use a distinct dictionary so
 * they stay observably different from the sequential scheme.
 */
final class GroupNamer
{
    private const WORDS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu'];

    private const RANDOM_WORDS = ['Aurora', 'Blizzard', 'Comet', 'Drift', 'Eclipse', 'Falcon', 'Glacier', 'Horizon', 'Ivy', 'Juniper', 'Kite', 'Lumen', 'Meadow', 'Nova', 'Orbit', 'Pine', 'Quartz', 'Raven', 'Summit', 'Tide'];

    public static function next(Session $session): string
    {
        $count = Group::query()->where('group_session_id', $session->id)->count();

        return self::sequentialAt($session, $count);
    }

    /**
     * Batch names for a bulk creation. Sequential names continue from the
     * session's current group count; random names stay unique across the
     * session, falling back to deterministic numeric suffixes once the
     * dictionary is exhausted instead of re-rolling indefinitely.
     *
     * @return array<int, string>
     */
    public static function batch(Session $session, int $count, bool $random = false): array
    {
        if ($random) {
            return self::randomBatch($session, $count);
        }

        $start = Group::query()->where('group_session_id', $session->id)->count();

        return array_map(
            fn (int $i): string => self::sequentialAt($session, $start + $i),
            range(0, $count - 1),
        );
    }

    private static function sequentialAt(Session $session, int $index): string
    {
        $naming = $session->config->rules()['naming'] ?? 'alpha';

        if ($naming === 'table') {
            return 'Table '.($index + 1);
        }

        $round = intdiv($index, count(self::WORDS));
        $word = self::WORDS[$index % count(self::WORDS)];

        return 'Team '.$word.($round > 0 ? ' '.($round + 1) : '');
    }

    /**
     * @return array<int, string>
     */
    private static function randomBatch(Session $session, int $count): array
    {
        // Names already used in this session are off-limits (case-insensitive),
        // so a second random bulk never re-creates an existing group name.
        $used = [];

        foreach (Group::query()->where('group_session_id', $session->id)->pluck('name') as $existing) {
            $used[mb_strtolower((string) $existing)] = true;
        }

        $pool = self::RANDOM_WORDS;
        shuffle($pool);

        $names = [];
        $fallbackIndex = 0;

        for ($i = 0; $i < $count; $i++) {
            $name = null;

            while ($pool !== [] && $name === null) {
                $candidate = array_shift($pool);

                if (! isset($used[mb_strtolower($candidate)])) {
                    $name = $candidate;
                }
            }

            // Dictionary exhausted (or every remaining word is taken):
            // deterministic numeric suffix starting at 1, re-checking the
            // used set, instead of unbounded re-rolls.
            if ($name === null) {
                do {
                    $candidate = self::RANDOM_WORDS[$fallbackIndex % count(self::RANDOM_WORDS)].' '.(intdiv($fallbackIndex, count(self::RANDOM_WORDS)) + 1);
                    $fallbackIndex++;
                } while (isset($used[mb_strtolower($candidate)]));

                $name = $candidate;
            }

            $used[mb_strtolower($name)] = true;
            $names[] = $name;
        }

        return $names;
    }
}
