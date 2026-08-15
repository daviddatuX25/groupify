<?php

namespace App\Plugins;

/**
 * Plugin registry (CAP-8, AD-9) — ONE term, two origins:
 *
 *   first_party  in-built plugins shipped with Groupify (session-toggled)
 *   authored     admin-created plugins (future: authored in the admin UI or
 *                installed third-party, same slot contract)
 *
 * The session config carries a single `plugins: []` list of enabled keys. An
 * enabled plugin never mutates core grouping logic.
 */
final class PluginRegistry
{
    public const ORIGIN_FIRST_PARTY = 'first_party';

    public const ORIGIN_AUTHORED = 'authored';

    /** First-party (in-built) plugins. Key => origin. */
    private const FIRST_PARTY = [
        'quiz' => self::ORIGIN_FIRST_PARTY,          // Event: live group quiz
        'match_me' => self::ORIGIN_FIRST_PARTY,      // Formation: one-tap auto-assign
        'proxy' => self::ORIGIN_FIRST_PARTY,         // Formation: pre-register absentees
        'announcements' => self::ORIGIN_FIRST_PARTY, // Communication: host broadcasts
        'moderation' => self::ORIGIN_FIRST_PARTY,    // Trust: message moderation queue
    ];

    /**
     * All registered plugins: key => origin. Authored plugins append here when
     * the authored layer lands (same slot contract, same config list).
     *
     * @return array<string, string>
     */
    public function registered(): array
    {
        return self::FIRST_PARTY;
    }

    /**
     * @return array<int, string>
     */
    public function keys(): array
    {
        return array_keys($this->registered());
    }

    /**
     * @param  array<int, string>  $keys
     * @return array<string, string>
     */
    public function only(array $keys): array
    {
        return array_intersect_key($this->registered(), array_fill_keys($keys, true));
    }
}
