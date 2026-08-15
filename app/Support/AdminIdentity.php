<?php

namespace App\Support;

/**
 * Presence-channel identity for the admin (FR-3.5): the broadcast auth
 * requires an Authenticatable-shaped user for the presence signature.
 */
class AdminIdentity
{
    public function __construct(
        public readonly string $id,
        public readonly string $name,
    ) {}

    public function getAuthIdentifier(): string
    {
        return $this->id;
    }

    public function getAuthIdentifierForBroadcasting(): string
    {
        return $this->id;
    }
}
