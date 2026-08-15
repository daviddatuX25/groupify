<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use App\Models\SessionMessage;
use App\Services\EventRecorder;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Chat tiers (CAP-10 slice): announcements (admin-only) + group chat
 * (members; leader-only optional). Gated by the chat_enabled flag.
 */
class MessageController
{
    public function index(Request $request, Session $session): JsonResponse
    {
        abort_unless($session->config->rules()['chat_enabled'] ?? false, 404);

        $me = $this->participant($request, $session);
        $memberGroupIds = Membership::query()
            ->where('participant_id', $me->id)
            ->where('status', 'active')
            ->pluck('group_id');

        /** @var Collection<int, array<string, mixed>> $messages */
        $messages = SessionMessage::query()
            ->where('group_session_id', $session->id)
            ->where('status', 'visible')
            ->where(fn ($q) => $q
                ->whereIn('scope', ['announcement', 'global'])
                ->orWhereIn('group_id', $memberGroupIds))
            ->with('author')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(function (SessionMessage $m): array {
                return [
                    'id' => $m->id,
                    'scope' => $m->scope,
                    'group_id' => $m->group_id,
                    'author' => $m->author !== null ? ($m->author->display_name ?? $m->author->name) : 'Facilitator',
                    'body' => $m->body,
                    'at' => Carbon::parse($m->created_at)->toIso8601String(),
                ];
            })
            ->values();

        return response()->json(['messages' => $messages]);
    }

    public function store(Request $request, Session $session, EventRecorder $recorder): JsonResponse
    {
        abort_unless($session->config->rules()['chat_enabled'] ?? false, 404);

        $data = $request->validate([
            'scope' => ['required', 'in:announcement,group,global'],
            'group_id' => ['nullable', 'integer', 'exists:groups,id'],
            'body' => ['required', 'string', 'max:1000'],
        ]);

        $requestAdmin = $request->header('X-Admin-Token', '');
        $isAdmin = $requestAdmin !== '' && hash_equals($session->admin_token, $requestAdmin);

        $authorId = null;
        $status = 'visible';
        if ($data['scope'] === 'global') {
            $me = $this->participant($request, $session);
            $authorId = $me->id;
            $mode = $session->config->rules()['global_chat_mode'] ?? 'open';
            if ($mode === 'muted') {
                throw ValidationException::withMessages(['scope' => 'Global chat is muted by the facilitator.']);
            }
            $status = $mode === 'moderated' ? 'pending' : 'visible';
        } elseif ($data['scope'] === 'announcement') {
            abort_unless($session->config->hasPlugin('announcements'), 404);
            $perms = app(PermissionService::class);
            $canAnnounce = $isAdmin && $perms->can('announce', 'admin', $session->config);
            if (! $canAnnounce && ! $isAdmin) {
                $me = $this->participant($request, $session);
                $canAnnounce = $me->custom_role !== null
                    && $perms->can('announce', $me->custom_role, $session->config);
            }
            abort_unless($canAnnounce, 404);
        } else {
            $me = $this->participant($request, $session);
            /** @var Group $group */
            $group = Group::query()->findOrFail($data['group_id']);
            abort_unless($group->group_session_id === $session->id, 404);

            $isMember = Membership::query()
                ->where('group_id', $group->id)
                ->where('participant_id', $me->id)
                ->where('status', 'active')
                ->exists();

            abort_unless($isMember, 404);

            if (($session->config->rules()['group_chat_mode'] ?? 'open') === 'leader' && $group->leader_id !== $me->id) {
                throw ValidationException::withMessages(['group_id' => 'Only the group leader can post here.']);
            }

            $authorId = $me->id;
        }

        $message = SessionMessage::query()->create([
            'group_session_id' => $session->id,
            'group_id' => $data['group_id'] ?? null,
            'author_id' => $authorId,
            'scope' => $data['scope'],
            'status' => $status,
            'body' => $data['body'],
        ]);

        if ($status === 'visible') {
            broadcast(new MessageCreated($session, $message->scope, $message->group_id))->toOthers();
        }
        $recorder->record($session, $data['scope'].'_message', ['group_id' => $data['group_id'] ?? null]);

        return response()->json(['ok' => true, 'message_id' => $message->id]);
    }

    private function participant(Request $request, Session $session): Participant
    {
        $data = Validator::make(
            ['device_token' => $request->header('X-Device-Token', $request->query('device_token', ''))],
            ['device_token' => ['required', 'uuid']],
        )->validate();

        $me = Participant::query()
            ->where('group_session_id', $session->id)
            ->where('token', $data['device_token'])
            ->first();

        abort_unless($me !== null, 404);

        return $me;
    }
}
