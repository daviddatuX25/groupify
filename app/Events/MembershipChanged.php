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
 * A membership changed (joined / left / leadership transferred).
 * AD-6: events carry IDs + revision; clients refetch the snapshot.
 */
class MembershipChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Session $session,
        public int $groupId,
        public string $action, // joined | left | leader_changed
    ) {}

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
            'group_id' => $this->groupId,
            'action' => $this->action,
            'revision' => (string) Str::uuid(),
        ];
    }
}
