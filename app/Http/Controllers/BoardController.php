<?php

namespace App\Http\Controllers;

use App\Models\Participant;
use App\Models\Session;
use App\Services\SessionSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * JSON board snapshot for the realtime client (AD-6: events → refetch).
 */
class BoardController
{
    public function show(Request $request, Session $session, SessionSnapshot $snapshot): JsonResponse
    {
        abort_unless(in_array($session->status, ['live', 'frozen', 'archived'], true), 404);

        $adminToken = $request->header('X-Admin-Token', $request->query('admin_token', ''));
        $isAdmin = $adminToken !== '' && hash_equals($session->admin_token, $adminToken);

        $token = $request->header('X-Device-Token', $request->query('device_token', ''));
        $me = $token === '' ? null : Participant::query()
            ->where('group_session_id', $session->id)
            ->where('token', $token)
            ->first();

        return response()->json([
            ...$snapshot->build($session, $me),
            'is_admin' => $isAdmin,
        ]);
    }
}
