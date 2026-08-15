<?php

namespace App\Http\Controllers\Admin;

use App\Models\Session;
use App\Services\SessionSnapshot;
use App\Support\RoleDefaults;
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
        $queryToken = $request->query('token');
        $headerToken = $request->header('X-Admin-Token');
        $token = is_string($queryToken) && $queryToken !== ''
            ? $queryToken
            : (is_string($headerToken) ? $headerToken : '');
        if ($token === '') {
            $sessionToken = $request->session()->get("groupify.admin.{$session->id}");
            $token = is_string($sessionToken) ? $sessionToken : '';
        }

        abort_unless(hash_equals($session->admin_token, $token), 404);
        $request->session()->put("groupify.admin.{$session->id}", $session->admin_token);

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
                // Permissions editor (flexibility-model.md §1): the action list
                // and the system defaults the matrix renders against.
                'perm_actions' => array_keys(RoleDefaults::MATRIX),
                'perm_defaults' => RoleDefaults::MATRIX,
            ],
        ]);
    }
}
