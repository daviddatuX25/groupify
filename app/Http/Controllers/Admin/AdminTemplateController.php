<?php

namespace App\Http\Controllers\Admin;

use App\Events\SessionConfigUpdated;
use App\Models\Session;
use App\Models\SessionTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminTemplateController
{
    use AuthorizesAdminToken;

    public function store(Request $request, Session $session): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $name = $request->validate(['name' => ['required', 'string', 'max:80']])['name'];

        $template = SessionTemplate::query()->updateOrCreate(
            ['name' => $name],
            ['config' => $session->config->toArray()],
        );

        return response()->json(['ok' => true, 'template_id' => $template->id]);
    }

    public function index(Request $request, Session $session): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $templates = SessionTemplate::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['templates' => $templates]);
    }

    public function apply(Request $request, Session $session, SessionTemplate $template): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $session->update(['config' => $template->config->toArray()]);

        broadcast(new SessionConfigUpdated($session))->toOthers();

        return response()->json(['ok' => true]);
    }
}
