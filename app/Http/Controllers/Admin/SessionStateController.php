<?php

namespace App\Http\Controllers\Admin;

use App\Events\SessionDeleted;
use App\Events\SessionStateUpdated;
use App\Models\Session;
use App\Services\EventRecorder;
use App\Support\SessionConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SessionStateController
{
    use AuthorizesAdminToken;

    /** Freeze / unfreeze (config rules.freeze, AD-4) and archive (status). */
    public function update(Request $request, Session $session, EventRecorder $recorder): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $action = $request->validate(['action' => ['required', Rule::in(['freeze', 'unfreeze', 'archive'])]])['action'];

        if ($action === 'archive') {
            if ($session->status === 'archived') {
                throw ValidationException::withMessages(['action' => 'Session is already archived.']);
            }

            $session->update(['status' => 'archived']);
        } else {
            $freeze = $action === 'freeze';
            $data = $session->config->toArray();
            $data['rules']['freeze'] = $freeze;
            $session->update(['config' => new SessionConfig($data)]);
        }

        broadcast(new SessionStateUpdated($session))->toOthers();
        $recorder->record($session, $action === 'archive' ? 'session_archived' : ($freeze ? 'session_frozen' : 'session_unfrozen'));

        return response()->json([
            'ok' => true,
            'status' => $session->fresh()->status,
            'freeze' => (bool) $session->fresh()->config->rules()['freeze'],
        ]);
    }

    /** Purge the session and all its rows (FR-1.4, AC 3) — full token revocation (AD-3). */
    public function destroy(Request $request, Session $session): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $code = $session->code;
        $session->delete();

        broadcast(new SessionDeleted($code));

        return response()->json(['ok' => true]);
    }
}
