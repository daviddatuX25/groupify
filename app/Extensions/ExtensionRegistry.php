<?php

namespace App\Extensions;

/**
 * Extension framework registry (CAP-8, AD-9).
 *
 * An extension = hooks on session events + own screens + own data; core grouping
 * logic is never mutated. Registered keys are the implemented, session-toggled
 * modules (flexibility-model.md §3 taxonomy). Plugins — future third-party
 * modules sharing the same slot contract — are not registered yet.
 */
final class ExtensionRegistry
{
    private const REGISTERED = [
        'quiz',          // Event: live group quiz (questions, auto-grading, leaderboard)
        'match_me',      // Formation: one-tap auto-assign for participants
        'proxy',         // Formation: pre-register absentees (field trips)
        'announcements', // Communication: host broadcasts to the room
        'moderation',    // Trust: message moderation queue
    ];

    /**
     * Keys that can be enabled today (implemented modules).
     *
     * @return array<int, string>
     */
    public function registered(): array
    {
        return self::REGISTERED;
    }
}
