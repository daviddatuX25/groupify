<?php

namespace App\Http\Controllers;

use App\Events\GroupCreated;
use App\Events\MembershipChanged;
use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use App\Services\EventRecorder;
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

        broadcast(new GroupCreated($group))->toOthers();
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
        if ($config->rules()['join_mode'] !== 'open') {
            throw ValidationException::withMessages(['group' => 'This session requires approval to join.']);
        }

        $joined = DB::transaction(function () use ($group, $me, $session) {
            $group = Group::query()->lockForUpdate()->findOrFail($group->id);
            if ($group->openSlots($session) <= 0) {
                throw ValidationException::withMessages(['group' => 'This group is full.']);
            }

            return $group->memberships()->create([
                'participant_id' => $me->id,
                'role' => 'member',
                'status' => 'active',
            ]);
        });

        broadcast(new MembershipChanged($session, $group->id, 'joined'))->toOthers();
        $recorder->record($session, 'member_joined', ['group_id' => $group->id, 'name' => $me->name]);

        return response()->json(['ok' => true, 'membership_id' => $joined->id]);
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
                $next = Membership::query()
                    ->where('group_id', $group->id)
                    ->where('status', 'active')
                    ->orderBy('id')
                    ->first();

                $group->update(['leader_id' => $next?->participant_id]);
                if ($next !== null) {
                    $next->update(['role' => 'leader']);
                }
            }

            return $wasLeader;
        });

        broadcast(new MembershipChanged($session, $group->id, $wasLeader ? 'leader_changed' : 'left'))->toOthers();
        $recorder->record($session, 'member_left', ['group_id' => $group->id, 'name' => $me->name]);

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
