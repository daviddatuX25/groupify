<?php

namespace App\Http\Controllers;

use App\Models\Session;
use App\Support\SessionConfig;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class SessionController
{
    /** GET /new — create-session page (FR-1.1). */
    public function new(): Response
    {
        return Inertia::render('Admin/New');
    }

    /** POST /sessions — create a session; creator becomes admin via token (AD-3). */
    public function store(): RedirectResponse
    {
        $session = $this->createSession();

        return redirect()->route('admin.sessions.show', [
            'session' => $session,
            'token' => $session->admin_token,
        ]);
    }

    /**
     * 6-digit numeric code (retry on collision), 4-digit PIN, bearer admin token.
     * AD-4: default config seeded at creation.
     */
    private function createSession(): Session
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $code = (string) random_int(100000, 999999);

            if (Session::where('code', $code)->exists()) {
                continue;
            }

            try {
                return Session::create([
                    'code' => $code,
                    'pin' => (string) random_int(1000, 9999),
                    'admin_token' => Str::random(40),
                    'status' => 'live',
                    'config' => SessionConfig::defaults(),
                ]);
            } catch (UniqueConstraintViolationException) {
                // A concurrent create took the code — retry.
            }
        }

        throw new RuntimeException('Could not allocate a unique session code.');
    }
}
