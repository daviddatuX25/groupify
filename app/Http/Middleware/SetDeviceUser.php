<?php

namespace App\Http\Middleware;

use App\Models\Participant;
use App\Models\Session;
use App\Support\AdminIdentity;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the broadcasting request's "user" from the device/admin token
 * (FR-3.5, AD-3): presence-channel auth has no session guard, so the channel
 * name + token header are the identity. The presence callback receives this.
 */
class SetDeviceUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->setUserResolver(function () use ($request) {
            $channel = (string) $request->input('channel_name', '');

            if (! preg_match('/^presence-session\.(\d{6})$/', $channel, $m)) {
                return null;
            }

            $session = Session::query()->where('code', $m[1])->first();

            if ($session === null) {
                return null;
            }

            $adminToken = $request->header('X-Admin-Token', '');
            if ($adminToken !== '' && hash_equals($session->admin_token, $adminToken)) {
                return new AdminIdentity('admin-'.$session->id, 'Admin');
            }

            $token = $request->header('X-Device-Token', $request->query('device_token', ''));

            return $token === '' ? null : Participant::query()
                ->where('group_session_id', $session->id)
                ->where('token', $token)
                ->first();
        });

        return $next($request);
    }
}
