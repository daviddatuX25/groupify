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

    /** All visible room and group messages for the admin's scoped monitor. */
    public function index(Request $request, Session $session): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $messages = SessionMessage::query()
            ->where('group_session_id', $session->id)
            ->where('status', 'visible')
            ->with('author')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (SessionMessage $m): array => [
                'id' => $m->id,
                'scope' => $m->scope,
                'group_id' => $m->group_id,
                'author' => $m->author !== null ? ($m->author->display_name ?? $m->author->name) : 'Facilitator',
                'body' => $m->body,
                'at' => Carbon::parse($m->created_at)->toIso8601String(),
            ])
            ->values();

        return response()->json(['messages' => $messages]);
    }

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
            // Also broadcast on reject: the decide handler's own refetch can
            // read a stale pending list (found-bugs #5); this second event
            // forces a fresh read so the queue header clears.
            broadcast(new MessageCreated($session, $message->scope, $message->group_id))->toOthers();
        }

        return response()->json(['ok' => true]);
    }
}
