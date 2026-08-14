<?php

namespace App\Events;

use App\Models\Group;
use App\Models\Session;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class GroupCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Session $session, public Group $group) {}

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
            'group_id' => $this->group->id,
            'name' => $this->group->name,
            'revision' => (string) Str::uuid(),
        ];
    }
}
