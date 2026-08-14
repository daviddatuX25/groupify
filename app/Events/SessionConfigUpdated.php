<?php

namespace App\Events;

use App\Models\Session;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

/**
 * Config changed (AD-1: transaction committed, then broadcast).
 * AD-6: events carry IDs + a revision — clients refetch the full snapshot.
 */
class SessionConfigUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Session $session) {}

    public function broadcastOn(): Channel
    {
        return new Channel('session.'.$this->session->code);
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->session->id,
            'revision' => (string) Str::uuid(),
        ];
    }
}
