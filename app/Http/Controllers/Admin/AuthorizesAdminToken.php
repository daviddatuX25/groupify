<?php

namespace App\Http\Controllers\Admin;

use App\Models\Session;
use Illuminate\Http\Request;

/**
 * Admin-token authorization for admin routes (AD-3). 404 (not 403) so session
 * existence is not leaked; tokens are bearer and revocable by delete/archive.
 */
trait AuthorizesAdminToken
{
    protected function authorizeAdmin(Session $session, Request $request): void
    {
        $token = $request->header('X-Admin-Token', $request->query('token', ''));

        abort_unless(hash_equals($session->admin_token, (string) $token), 404);
    }
}
