<?php

namespace App\Http\Controllers\Admin;

use App\Models\Session;
use App\Models\SessionEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminActivityController
{
    use AuthorizesAdminToken;

    public function index(Request $request, Session $session): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $events = $session->events()
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(function (SessionEvent $e): array {
                return [
                    'type' => $e->type,
                    'payload' => $e->payload ?? [],
                    'at' => Carbon::parse($e->created_at)->toIso8601String(),
                ];
            });

        return response()->json(['events' => $events->values()]);
    }
}
