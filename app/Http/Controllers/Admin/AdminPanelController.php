<?php

namespace App\Http\Controllers\Admin;

use App\Models\Session;
use App\Services\SessionSnapshot;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminPanelController
{
    /**
     * Admin panel — token-gated (AD-3). 404 (not 403) so session existence is not leaked.
     */
    public function show(Request $request, Session $session, SessionSnapshot $snapshot): Response
    {
        $token = $request->query('token', $request->header('X-Admin-Token', ''));

        abort_unless(hash_equals($session->admin_token, (string) $token), 404);

        $board = $snapshot->build($session, null, true);

        return Inertia::render('Admin/Show', [
            'session' => [
                'id' => $session->id,
                'code' => $session->code,
                'pin' => $session->pin,
                'status' => $session->status,
                'config' => $session->config->toArray(),
                'presence' => $board['presence'],
                'pool' => $board['pool'],
                'groups' => $board['groups'],
                // The client persists this and sends it as X-Admin-Token for admin actions (AD-3).
                'admin_token' => $session->admin_token,
            ],
        ]);
    }
}
