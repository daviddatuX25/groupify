<?php

namespace App\Http\Controllers;

use App\Models\Session;
use App\Models\SessionTemplate;
use App\Support\SessionConfig;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
    public function store(Request $request): RedirectResponse
    {
        $setup = $request->validate([
            'join_mode' => ['sometimes', 'in:open,approval'],
            'qr_pinless' => ['sometimes', 'boolean'],
            'retention_days' => ['nullable', 'integer', 'in:1,2,30,180'],
            'ends_at' => ['nullable', 'date', 'after:now'],
        ]);
        $session = $this->createSession($request, $setup);
        $request->session()->put(
            "groupify.admin.{$session->id}",
            $session->admin_token,
        );

        return redirect()->route('admin.sessions.show', [
            'session' => $session,
            'token' => $session->admin_token,
        ]);
    }

    /**
     * 6-digit numeric code (retry on collision), 4-digit PIN, bearer admin token.
     * AD-4: default config seeded at creation.
     */
    /**
     * @param  array<string, mixed>  $setup
     */
    private function createSession(Request $request, array $setup): Session
    {
        $template = null;
        $templateId = $request->input('template_id');
        if ($templateId !== null) {
            $template = SessionTemplate::query()->findOrFail((int) $templateId);
        }

        $config = SessionConfig::deepMerge(
            SessionConfig::defaults(),
            $template?->config->toArray() ?? [],
        );
        $config['rules']['join_mode'] = $setup['join_mode'] ?? $config['rules']['join_mode'];
        $config['rules']['qr_pinless'] = $setup['qr_pinless'] ?? $config['rules']['qr_pinless'];
        if (array_key_exists('retention_days', $setup)) {
            $config['rules']['retention_days'] = $setup['retention_days'];
        }

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
                    'qr_token' => Str::random(64),
                    'status' => 'live',
                    'ends_at' => isset($setup['ends_at']) ? Carbon::parse($setup['ends_at']) : null,
                    'config' => $config,
                ]);
            } catch (UniqueConstraintViolationException) {
                // A concurrent create took the code — retry.
            }
        }

        throw new RuntimeException('Could not allocate a unique session code.');
    }
}
