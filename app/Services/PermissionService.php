<?php

namespace App\Services;

use App\Support\RoleDefaults;
use App\Support\SessionConfig;

/**
 * Centralized permission resolution (AD-5).
 * can?(action, role) = session override → role default → system default.
 * UI affordances render from the server-computed allowed-action set; this is
 * also the enforcement point for every mutating endpoint.
 */
class PermissionService
{
    public function can(string $action, string $role, SessionConfig $config): bool
    {
        $roles = $config->roles();
        if (isset($roles[$role])) {
            return in_array($action, $roles[$role], true);
        }

        $perms = $config->perms();

        if (isset($perms[$action][$role])) {
            return (bool) $perms[$action][$role];
        }

        return RoleDefaults::get($action, $role);
    }

    /** Allowed actions for a role — the set the UI may render (AD-5).
     *
     * @return array<int, string>
     */
    public function allowedActions(string $role, SessionConfig $config): array
    {
        $actions = array_keys(RoleDefaults::MATRIX);

        return array_values(array_filter($actions, fn (string $a) => $this->can($a, $role, $config)));
    }
}
