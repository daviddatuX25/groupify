<?php

namespace App\Events;

use App\Models\Session;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QuizStateUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /** @param  array<string, mixed>  $state */
    public function __construct(public Session $session, public array $state) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("session.{$this->session->code}")];
    }

    public function broadcastAs(): string
    {
        return 'quiz.updated';
    }
}
