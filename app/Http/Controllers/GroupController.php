<?php

namespace App\Http\Controllers;

use App\Events\GroupCreated;
use App\Events\MembershipChanged;
use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use App\Services\EventRecorder;
use App\Services\GroupLeadershipService;
use App\Services\PermissionService;
use App\Support\GroupNamer;
use App\Support\SessionConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Participant group mutations (FR-4.1 … FR-4.3). Every mutation re-checks
 * status + freeze + capacity transactionally (AD-7); identity is the device
 * token (AD-3); mutations commit then broadcast (AD-1).
 */
class GroupController
{
    public function store(Request $request, Session $session, EventRecorder $recorder): JsonResponse
    {
        $me = $this->participant($request, $session);
        $this->assertMutable($session);
        $this->assertPooled($me);

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:80'],
            'capacity' => ['sometimes', 'integer', 'min:'.$session->config->rules()['min_members'], 'max:'.$session->config->rules()['max_members']],
            'field_values' => ['sometimes', 'array'],
        ]);

        $config = $session->config;
        $perms = app(PermissionService::class);

        if (! $config->rules()['allow_user_creation'] || ! $perms->can('create_group', 'member', $config)) {
            throw ValidationException::withMessages(['group' => 'Group creation is disabled by the facilitator.']);
        }

        if (isset($data['capacity']) && ! $perms->can('set_group_size', 'leader', $config)) {
            throw ValidationException::withMessages(['capacity' => 'Group size is controlled by the facilitator.']);
        }

        $fieldValues = $this->validateFields($request, $config);
        if ($fieldValues !== [] && ! $perms->can('fill_group_fields', 'leader', $config)) {
            throw ValidationException::withMessages(['field_values' => 'Group fields are controlled by the facilitator.']);
        }

        $name = trim($data['name'] ?? '') !== '' ? $data['name'] : GroupNamer::next($session);

        $group = DB::transaction(function () use ($session, $me, $name, $fieldValues, $data) {
            $group = $session->groups()->create([
                'leader_id' => $me->id,
                'name' => $name,
                'capacity' => $data['capacity'] ?? null,
                'field_values' => $fieldValues,
            ]);
            $group->memberships()->create([
                'participant_id' => $me->id,
                'role' => 'leader',
                'status' => 'active',
            ]);

            return $group;
        });

        broadcast(new GroupCreated($session, $group))->toOthers();
        $recorder->record($session, 'group_created', ['group_id' => $group->id, 'name' => $group->name]);

        return response()->json(['ok' => true, 'group_id' => $group->id, 'name' => $group->name]);
    }

    public function join(Request $request, Session $session, Group $group, EventRecorder $recorder): JsonResponse
    {
        $me = $this->participant($request, $session);
        $this->assertMutable($session);
        $this->assertPooled($me);
        $this->assertGroupInSession($group, $session);

        $config = $session->config;
        $isApproval = $config->rules()['join_mode'] !== 'open';

        $joined = DB::transaction(function () use ($group, $me, $session, $isApproval) {
            if (! $isApproval) {
                $group = Group::query()->lockForUpdate()->findOrFail($group->id);
                if ($group->openSlots($session) <= 0) {
                    throw ValidationException::withMessages(['group' => 'This group is full.']);
                }
            }

            return $group->memberships()->create([
                'participant_id' => $me->id,
                'role' => 'member',
                'status' => $isApproval ? 'pending' : 'active',
            ]);
        });

        $action = $isApproval ? 'pending' : 'joined';
        broadcast(new MembershipChanged($session, $group->id, $action))->toOthers();
        $recorder->record($session, $isApproval ? 'join_requested' : 'member_joined', ['group_id' => $group->id, 'name' => $me->name]);

        return response()->json(['ok' => true, 'membership_id' => $joined->id, 'status' => $joined->status]);
    }

    public function leave(Request $request, Session $session, Group $group, EventRecorder $recorder): JsonResponse
    {
        $me = $this->participant($request, $session);
        $this->assertMutable($session);
        $this->assertGroupInSession($group, $session);

        $wasLeader = DB::transaction(function () use ($group, $me) {
            $membership = Membership::query()
                ->where('group_id', $group->id)
                ->where('participant_id', $me->id)
                ->where('status', 'active')
                ->first();

            if ($membership === null) {
                throw ValidationException::withMessages(['group' => 'You are not in this group.']);
            }

            $wasLeader = $membership->role === 'leader';
            $membership->delete();

            if ($wasLeader) {
                app(GroupLeadershipService::class)->rebalanceAfterRemoval($group);
            }

            return $wasLeader;
        });

        broadcast(new MembershipChanged($session, $group->id, $wasLeader ? 'leader_changed' : 'left'))->toOthers();
        $recorder->record($session, 'member_left', ['group_id' => $group->id, 'name' => $me->name]);

        return response()->json(['ok' => true]);
    }

    /** Match me: auto-assign the pooled participant to the least-full group (CAP-12). */
    public function matchMe(Request $request, Session $session, EventRecorder $recorder): JsonResponse
    {
        abort_unless($session->config->hasPlugin('match_me'), 404);
        $me = $this->participant($request, $session);
        $this->assertMutable($session);
        $this->assertPooled($me);

        $group = DB::transaction(function () use ($session, $me) {
            $group = Group::query()
                ->where('group_session_id', $session->id)
                ->get()
                ->filter(fn (Group $g) => $g->openSlots($session) > 0)
                ->sortByDesc(fn (Group $g) => $g->openSlots($session))
                ->first();

            if ($group === null) {
                throw ValidationException::withMessages(['group' => 'No group has space right now.']);
            }

            $group->memberships()->create([
                'participant_id' => $me->id,
                'role' => 'member',
                'status' => 'active',
            ]);

            return $group;
        });

        broadcast(new MembershipChanged($session, $group->id, 'joined'))->toOthers();
        $recorder->record($session, 'member_joined', ['group_id' => $group->id, 'name' => $me->name, 'auto' => true]);

        return response()->json(['ok' => true, 'group_id' => $group->id]);
    }

    /** Group leader kicks a member back to the pool (CAP-10). */
    public function kick(Request $request, Session $session, Group $group, Participant $participant, EventRecorder $recorder): JsonResponse
    {
        $me = $this->participant($request, $session);
        $this->assertMutable($session);
        $this->assertGroupInSession($group, $session);

        $perms = app(PermissionService::class);
        if ($group->leader_id !== $me->id || ! $perms->can('kick_ban', 'leader', $session->config)) {
            abort(404);
        }

        Membership::query()
            ->where('group_id', $group->id)
            ->where('participant_id', $participant->id)
            ->where('status', 'active')
            ->delete();

        broadcast(new MembershipChanged($session, $group->id, 'left'))->toOthers();
        $recorder->record($session, 'member_kicked', ['group_id' => $group->id, 'name' => $participant->name]);

        return response()->json(['ok' => true]);
    }

    /** Leader approves a pending join request (FR-4.2, CAP-4). */
    public function approve(Request $request, Session $session, Group $group, Participant $participant, EventRecorder $recorder): JsonResponse
    {
        $this->assertMutable($session);
        $this->assertGroupInSession($group, $session);

        // Admin may act on any pending request; otherwise the group leader decides.
        $requestAdmin = $request->header('X-Admin-Token', '');
        $isAdmin = $requestAdmin !== '' && hash_equals($session->admin_token, $requestAdmin);

        if (! $isAdmin) {
            $me = $this->participant($request, $session);
            if ($group->leader_id !== $me->id) {
                abort(404);
            }

            $perms = app(PermissionService::class);
            if (! $perms->can('approve_join', 'leader', $session->config)) {
                throw ValidationException::withMessages(['group' => 'Approvals are controlled by the facilitator.']);
            }
        }

        $membership = Membership::query()
            ->where('group_id', $group->id)
            ->where('participant_id', $participant->id)
            ->where('status', 'pending')
            ->first();

        abort_unless($membership !== null, 404);

        // CAP-4/CAP-6: never overfill a group or double-seat a participant.
        if (Membership::query()->where('participant_id', $participant->id)->where('status', 'active')->exists()) {
            throw ValidationException::withMessages(['participant' => 'This participant is already in a group.']);
        }

        $capacity = (int) $group->capacity;
        if ($capacity > 0 && Membership::query()->where('group_id', $group->id)->where('status', 'active')->count() >= $capacity) {
            throw ValidationException::withMessages(['group' => 'This group is full.']);
        }

        $membership->update(['status' => 'active', 'role' => 'member']);

        broadcast(new MembershipChanged($session, $group->id, 'approved'))->toOthers();
        $recorder->record($session, 'join_approved', ['group_id' => $group->id, 'name' => $participant->name]);

        return response()->json(['ok' => true]);
    }

    /** Leader rejects a pending join request. */
    public function reject(Request $request, Session $session, Group $group, Participant $participant, EventRecorder $recorder): JsonResponse
    {
        $this->assertMutable($session);
        $this->assertGroupInSession($group, $session);

        // Admin may act on any pending request; otherwise the group leader decides.
        $requestAdmin = $request->header('X-Admin-Token', '');
        $isAdmin = $requestAdmin !== '' && hash_equals($session->admin_token, $requestAdmin);

        if (! $isAdmin) {
            $me = $this->participant($request, $session);
            if ($group->leader_id !== $me->id) {
                abort(404);
            }

            $perms = app(PermissionService::class);
            if (! $perms->can('approve_join', 'leader', $session->config)) {
                throw ValidationException::withMessages(['group' => 'Approvals are controlled by the facilitator.']);
            }
        }

        $membership = Membership::query()
            ->where('group_id', $group->id)
            ->where('participant_id', $participant->id)
            ->where('status', 'pending')
            ->first();

        abort_unless($membership !== null, 404);

        $membership->delete();

        broadcast(new MembershipChanged($session, $group->id, 'rejected'))->toOthers();
        $recorder->record($session, 'join_rejected', ['group_id' => $group->id, 'name' => $participant->name]);

        return response()->json(['ok' => true]);
    }

    private function participant(Request $request, Session $session): Participant
    {
        $data = Validator::make(['device_token' => $request->header('X-Device-Token', $request->query('device_token', ''))], [
            'device_token' => ['required', 'uuid'],
        ])->validate();

        $me = Participant::query()
            ->where('group_session_id', $session->id)
            ->where('token', $data['device_token'])
            ->first();

        abort_unless($me !== null, 404);

        return $me;
    }

    private function assertMutable(Session $session): void
    {
        abort_unless($session->status === 'live' && ! $session->config->rules()['freeze'], 404);
    }

    private function assertPooled(Participant $me): void
    {
        $inGroup = Membership::query()
            ->where('participant_id', $me->id)
            ->where('status', 'active')
            ->exists();

        if ($inGroup) {
            throw ValidationException::withMessages(['group' => 'You are already in a group.']);
        }
    }

    private function assertGroupInSession(Group $group, Session $session): void
    {
        abort_unless($group->group_session_id === $session->id, 404);
    }

    /**
     * @return array<string, string>
     */
    private function validateFields(Request $request, SessionConfig $config): array
    {
        $rules = [];
        foreach ($config->fields() as $field) {
            $name = (string) $field['name'];
            $fieldRules = ['string', 'max:255'];
            if (($field['required'] ?? false) === true) {
                $fieldRules[] = 'required';
            } else {
                $fieldRules[] = 'nullable';
            }
            $rules['field_values.'.$name] = $fieldRules;
        }

        return $request->validate($rules)['field_values'] ?? [];
    }
}
