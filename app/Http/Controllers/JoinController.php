<?php

namespace App\Http\Controllers;

use App\Models\Participant;
use App\Models\Session;
use App\Services\EventRecorder;
use App\Support\RandomName;
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

        $name = trim($data['name']);

        $bannedByName = Participant::query()
            ->where('group_session_id', $session->id)
            ->whereNotNull('banned_at')
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->exists();

        $bannedByToken = Participant::query()
            ->where('group_session_id', $session->id)
            ->where('token', $data['device_token'])
            ->whereNotNull('banned_at')
            ->exists();

        if ($bannedByName || $bannedByToken) {
            throw ValidationException::withMessages(['name' => 'This name is banned from the session.']);
        }
        $guestList = $session->config->guestList();
        if ($guestList !== []) {
            $allowed = array_map(fn ($n) => mb_strtolower(trim((string) $n)), $guestList);
            if (! in_array(mb_strtolower($name), $allowed, true)) {
                throw ValidationException::withMessages(['name' => 'That name is not on the guest list.']);
            }

            $claimed = Participant::query()
                ->where('group_session_id', $session->id)
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                ->whereNotNull('token')
                ->exists();

            if ($claimed) {
                throw ValidationException::withMessages(['name' => 'That name is already taken.']);
            }
        }

        // AD-7: one seat per (session, device token) — same token rejoins its seat.
        $anonymous = $session->config->rules()['anonymous_mode'] ?? false;

        // Proxy claim (CAP-11): joining with an existing seat's name claims it
        // when the seat is unclaimed; a claimed seat rejects other devices.
        $seat = Participant::query()
            ->where('group_session_id', $session->id)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->first();

        if ($seat !== null && $seat->token !== $data['device_token']) {
            if ($seat->token !== null) {
                throw ValidationException::withMessages(['name' => 'That name is already taken.']);
            }

            $seat->update(['token' => $data['device_token']]);
            $participant = $seat;
            $recorder->record($session, 'participant_joined', ['name' => $participant->name]);
        } elseif ($seat !== null) {
            $participant = $seat;
        } else {
            $participant = Participant::query()->firstOrCreate(
                ['group_session_id' => $session->id, 'token' => $data['device_token']],
                [
                    'name' => $name,
                    'display_name' => $anonymous ? RandomName::generate() : null,
                    'email' => $data['email'] ?? null,
                ],
            );
        }

        if ($participant->wasRecentlyCreated) {
            $recorder->record($session, 'participant_joined', ['name' => $participant->name]);
        }

        return redirect()->route('session.show', [
            'session' => $session,
            'device_token' => $data['device_token'],
        ]);
    }
}
