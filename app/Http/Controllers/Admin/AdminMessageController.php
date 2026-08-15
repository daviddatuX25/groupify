<?php

namespace App\Http\Controllers\Admin;

use App\Events\MessageCreated;
use App\Models\Session;
use App\Models\SessionMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Global-chat moderation queue (Slido "In review" pattern): pending messages
 * are invisible until the admin approves (visible) or rejects (deleted).
 */
class AdminMessageController
{
    use AuthorizesAdminToken;

    public function pending(Request $request, Session $session): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $messages = SessionMessage::query()
            ->where('group_session_id', $session->id)
            ->where('status', 'pending')
            ->with('author')
            ->orderBy('created_at')
            ->limit(50)
            ->get()
            ->map(function (SessionMessage $m): array {
                return [
                    'id' => $m->id,
                    'scope' => $m->scope,
                    'author' => $m->author !== null ? $m->author->name : 'Participant',
                    'body' => $m->body,
                    'at' => Carbon::parse($m->created_at)->toIso8601String(),
                ];
            })
            ->values();

        return response()->json(['messages' => $messages]);
    }

    public function decide(Request $request, Session $session, SessionMessage $message): JsonResponse
    {
        abort_unless($session->config->hasPlugin('moderation'), 404);
        $this->authorizeAdmin($session, $request);

        abort_unless($message->group_session_id === $session->id, 404);

        $action = $request->validate(['action' => ['required', 'in:approve,reject']])['action'];

        if ($action === 'approve') {
            $message->update(['status' => 'visible']);
            broadcast(new MessageCreated($session, $message->scope, $message->group_id))->toOthers();
        } else {
            $message->delete();
        }

        return response()->json(['ok' => true]);
    }
}
