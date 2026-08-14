<?php

namespace App\Services;

use App\Models\Session;
use App\Models\SessionEvent;

/**
 * Append-only activity log (FR-5.6) — feeds the admin feed and future
 * audit/moderation (CAP-10).
 */
class EventRecorder
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function record(Session $session, string $type, array $payload = []): void
    {
        SessionEvent::query()->create([
            'group_session_id' => $session->id,
            'type' => $type,
            'payload' => $payload,
        ]);
    }
}
