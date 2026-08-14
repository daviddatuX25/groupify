<?php

namespace App\Http\Controllers;

use App\Models\Participant;
use App\Models\Session;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class JoinController
{
    /** GET /join/{code} — participant entry (FR-2.1). PIN is never exposed here. */
    public function show(Session $session): Response
    {
        return Inertia::render('Session/Join', [
            'session' => ['code' => $session->code, 'status' => $session->status],
        ]);
    }

    /** POST /join/{code} — validate PIN + identity, create/reuse the seat (AD-7). */
    public function store(Request $request, Session $session): RedirectResponse
    {
        if ($session->status !== 'live') {
            abort(404);
        }

        $data = $request->validate([
            'pin' => ['required', 'digits:4'],
            'name' => ['required', 'string', 'max:80'],
            'email' => ['nullable', 'email', 'max:255'],
            'device_token' => ['required', 'uuid'],
        ]);

        if (! hash_equals($session->pin, $data['pin'])) {
            throw ValidationException::withMessages(['pin' => 'Wrong PIN.']);
        }

        // AD-7: one seat per (session, device token) — same token rejoins its seat.
        $participant = Participant::query()->firstOrCreate(
            ['group_session_id' => $session->id, 'token' => $data['device_token']],
            ['name' => $data['name'], 'email' => $data['email'] ?? null],
        );

        return redirect()->route('session.show', $session);
    }
}
