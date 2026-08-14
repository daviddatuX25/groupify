<?php

namespace App\Http\Controllers;

use App\Models\Participant;
use App\Models\Session;
use App\Services\EventRecorder;
use Illuminate\Http\JsonResponse;
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

    /**
     * GET /join/{code}/seat — does this device token already hold a seat? (FR-2.4)
     * Returning devices skip the form and land straight in their seat.
     */
    public function seat(Request $request, Session $session): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'uuid']]);

        $participant = Participant::query()
            ->where('group_session_id', $session->id)
            ->where('token', $data['token'])
            ->first();

        return response()->json([
            'seat' => $participant !== null,
            'name' => $participant?->name,
        ]);
    }

    /** POST /join/{code} — validate PIN + identity, create/reuse the seat (AD-7). */
    public function store(Request $request, Session $session, EventRecorder $recorder): RedirectResponse
    {
        if ($session->status !== 'live' || $session->config->rules()['freeze']) {
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

        if ($participant->wasRecentlyCreated) {
            $recorder->record($session, 'participant_joined', ['name' => $participant->name]);
        }

        return redirect()->route('session.show', [
            'session' => $session,
            'device_token' => $data['device_token'],
        ]);
    }
}
