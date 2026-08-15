<?php

use App\Models\Participant;
use Illuminate\Support\Facades\Broadcast;

// FR-3.5 live presence: the channel is public to join once the token
// resolves (SetDeviceUser middleware); members see each other's names.
// The Pusher conventions normalize 'presence-session.{code}' → 'session.{code}'
// before pattern matching, so the registered pattern is the normalized name.
Broadcast::channel('session.{code}', function (mixed $user) {
    if ($user === null) {
        return null;
    }

    $name = $user instanceof Participant ? ($user->display_name ?? $user->name) : $user->name;

    return ['name' => $name];
});
