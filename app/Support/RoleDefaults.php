<?php

namespace App\Support;

/**
 * System default permission matrix (flexibility-model.md §1).
 * Resolution order: session override → role default → system default.
 */
final class RoleDefaults
{
    public const MATRIX = [
        'create_group' => ['admin' => true, 'leader' => true, 'member' => true],
        'set_group_size' => ['admin' => true, 'leader' => true, 'member' => false],
        'approve_join' => ['admin' => true, 'leader' => true, 'member' => false],
        'move_members' => ['admin' => true, 'leader' => false, 'member' => false],
        'dissolve_all_groups' => ['admin' => true, 'leader' => false, 'member' => false],
        'fill_group_fields' => ['admin' => true, 'leader' => true, 'member' => true],
        'announce' => ['admin' => true, 'leader' => false, 'member' => false],
        'kick_ban' => ['admin' => true, 'leader' => true, 'member' => false],
        'answer_quiz' => ['admin' => false, 'leader' => true, 'member' => false],
        'export_csv' => ['admin' => true, 'leader' => false, 'member' => false],
    ];

    public static function get(string $action, string $role): bool
    {
        return self::MATRIX[$action][$role] ?? false;
    }
}
