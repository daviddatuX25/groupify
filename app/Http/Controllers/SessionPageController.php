<?php

namespace App\Http\Controllers;

use App\Models\Participant;
use App\Models\Session;
use App\Services\SessionSnapshot;
use Inertia\Inertia;
use Inertia\Response;

class SessionPageController
{
    /**
     * GET /s/{code} — the live board snapshot (CAP-3).
     * Identity resolved from the device token (AD-3); no token = guest view.
     */
    public function show(Session $session, SessionSnapshot $snapshot): Response
    {
        abort_unless(in_array($session->status, ['live', 'frozen', 'archived'], true), 404);

        $token = request()->header('X-Device-Token', request()->query('device_token', ''));
        $me = $token === '' ? null : Participant::query()
            ->where('group_session_id', $session->id)
            ->where('token', $token)
            ->first();

        return Inertia::render('Session/Show', [
            'session' => $snapshot->build($session, $me),
        ]);
    }
}
