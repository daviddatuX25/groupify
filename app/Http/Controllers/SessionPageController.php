<?php

namespace App\Http\Controllers;

use App\Models\Session;
use Inertia\Inertia;
use Inertia\Response;

class SessionPageController
{
    /** GET /s/{code} — participant home (pool + board arrive in Epic 2). */
    public function show(Session $session): Response
    {
        abort_unless(in_array($session->status, ['live', 'frozen'], true), 404);

        return Inertia::render('Session/Show', [
            'session' => [
                'code' => $session->code,
                'status' => $session->status,
                'config' => $session->config->toArray(),
            ],
        ]);
    }
}
