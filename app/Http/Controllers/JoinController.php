<?php

namespace App\Http\Controllers;

use App\Events\MembershipChanged;
use App\Models\Participant;
use App\Models\Session;
use App\Services\EventRecorder;
use App\Support\RandomName;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class JoinController
{
    /** GET /join/{code} — participant entry (FR-2.1). PIN is never exposed here. */
    public function show(Request $request, Session $session): Response
    {
        $pinless = $this->pinlessAccess($session, $request->query('qr_token'));

        return Inertia::render('Session/Join', [
            'session' => [
                'id' => $session->id,
                'code' => $session->code,
                'status' => $session->status,
                'pin_required' => ! $pinless,
                'ends_at' => $session->ends_at?->toIso8601String(),
                'purge_at' => $session->purge_at?->toIso8601String(),
            ],
        ]);
    }

    private function pinlessAccess(Session $session, mixed $qrToken): bool
    {
        $rules = $session->config->rules();
        if (($rules['join_mode'] ?? 'open') === 'open') {
            return true;
        }

        return is_string($qrToken)
            && is_string($session->qr_token)
            && $qrToken !== ''
            && hash_equals($session->qr_token, $qrToken)
            && (bool) ($rules['qr_pinless'] ?? true);
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
            'pin' => ['nullable', 'digits:4'],
            'name' => ['required', 'string', 'max:80'],
            'email' => ['nullable', 'email', 'max:255'],
            'device_token' => ['required', 'uuid'],
            'qr_token' => ['nullable', 'string', 'max:128'],
        ]);

        $pinless = $this->pinlessAccess($session, $data['qr_token'] ?? null);

        if (! $pinless && ($data['pin'] ?? '') === '') {
            throw ValidationException::withMessages(['pin' => 'Enter the 4-digit PIN shown by the host.']);
        }

        // PIN brute-force guard: 10 wrong PINs per session within 5 minutes
        // locks further attempts for that session only (mass joins from one
        // NAT stay unaffected — the generic per-IP throttle is gone).
        $limiter = app(RateLimiter::class);
        $key = 'join-pin:'.$session->id;

        if (! $pinless) {
            if (! hash_equals($session->pin, $data['pin'] ?? '')) {
                $limiter->hit($key, 5 * 60);
                if ($limiter->tooManyAttempts($key, 10)) {
                    abort(429, 'Too many failed PIN attempts. Try again in a few minutes.');
                }
                throw ValidationException::withMessages(['pin' => 'Wrong PIN.']);
            }

            $limiter->clear($key);
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
        $seat = Participant::query()
            ->where('group_session_id', $session->id)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->first();
        $joinedNow = false;

        if ($seat !== null && $seat->token !== $data['device_token']) {
            if ($seat->token !== null) {
                throw ValidationException::withMessages(['name' => 'That name is already taken.']);
            }

            $seat->update(['token' => $data['device_token']]);
            $participant = $seat;
            $joinedNow = true;
            $recorder->record($session, 'participant_joined', ['name' => $participant->name]);
        } elseif ($seat !== null) {
            $participant = $seat;
        } else {
            $participant = Participant::query()->firstOrCreate(
                ['group_session_id' => $session->id, 'token' => $data['device_token']],
                [
                    'name' => $name,
                    'display_name' => $anonymous ? RandomName::generate() : null,
                    'avatar_style' => 'initials',
                    'avatar_seed' => Str::random(16),
                    'email' => $data['email'] ?? null,
                ],
            );
            $joinedNow = $participant->wasRecentlyCreated;
        }

        if ($participant->wasRecentlyCreated) {
            $recorder->record($session, 'participant_joined', ['name' => $participant->name]);
        }

        if ($joinedNow) {
            broadcast(new MembershipChanged($session, 0, 'participant_joined'))->toOthers();
        }

        return redirect()->route('session.show', [
            'session' => $session,
            'device_token' => $data['device_token'],
        ]);
    }
}
