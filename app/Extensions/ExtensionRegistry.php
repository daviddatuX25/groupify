<?php

namespace App\Extensions;

/**
 * Extension framework registry (CAP-8, AD-9).
 *
 * An extension = hooks on session events + own screens + own data; core grouping
 * logic is never mutated. Night-one: the registry + validation exist, zero
 * modules ship. Planned keys (roadmap): chat, approval-queue, proxy, auto-dissolve,
 * match-me, device-binding, quiz, custom-roles.
 */
final class ExtensionRegistry
{
    /**
     * Keys that can be enabled today (implemented modules).
     *
     * @return array<int, string>
     */
    public function registered(): array
    {
        return [];
    }
}
