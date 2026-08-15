<?php

namespace App\Http\Controllers;

use App\Events\SessionStateUpdated;
use App\Models\Participant;
use App\Models\Session;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ParticipantProfileController
{
    public function update(Request $request, Session $session): JsonResponse
    {
        abort_unless($session->status === 'live', 404);

        $token = $request->header('X-Device-Token');
        abort_unless(is_string($token) && $token !== '', 404);

        $participant = Participant::query()
            ->where('group_session_id', $session->id)
            ->where('token', $token)
            ->firstOrFail();

        $data = $request->validate([
            'avatar_style' => ['required', 'string', Rule::in(['initials', 'lorelei', 'adventurer', 'bottts-neutral'])],
            'avatar_seed' => ['required', 'string', 'max:48'],
        ]);

        $participant->update([
            'avatar_style' => $data['avatar_style'],
            'avatar_seed' => trim($data['avatar_seed']),
        ]);

        broadcast(new SessionStateUpdated($session))->toOthers();

        return response()->json([
            'ok' => true,
            'avatar' => [
                'style' => $participant->avatar_style,
                'seed' => $participant->avatar_seed,
            ],
        ]);
    }
}
