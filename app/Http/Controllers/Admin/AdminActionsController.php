<?php

namespace App\Http\Controllers\Admin;

use App\Events\GroupCreated;
use App\Events\MembershipChanged;
use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use App\Services\EventRecorder;
use App\Services\GroupLeadershipService;
use App\Support\GroupNamer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Admin god-mode actions (FR-5.2, FR-5.3). Admin is exempt from the freeze
 * (FR-1.3); token auth via AuthorizesAdminToken; commit then broadcast (AD-1).
 */
class AdminActionsController
{
    use AuthorizesAdminToken;

    /** Create an empty group without consuming a participant seat. */
    public function createGroup(Request $request, Session $session, EventRecorder $recorder): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $rules = $session->config->rules();
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:80'],
            'capacity' => ['sometimes', 'integer', 'min:'.$rules['min_members'], 'max:'.$rules['max_members']],
        ]);

        $name = trim((string) ($data['name'] ?? '')) !== '' ? $data['name'] : GroupNamer::next($session);
        $group = $session->groups()->create([
            'name' => $name,
            'capacity' => $data['capacity'] ?? null,
            'field_values' => [],
        ]);

        broadcast(new GroupCreated($session, $group))->toOthers();
        $recorder->record($session, 'group_created', ['group_id' => $group->id, 'name' => $group->name, 'by' => 'admin']);

        return response()->json(['ok' => true, 'group_id' => $group->id, 'name' => $group->name]);
    }

    /**
     * Create many empty groups atomically (bulk). Names come from
     * GroupNamer::batch(); every committed group broadcasts GroupCreated and
     * the whole request records one aggregate activity event.
     */
    public function createGroups(Request $request, Session $session, EventRecorder $recorder): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $rules = $session->config->rules();
        $data = $request->validate([
            // Manual names belong on the single-create endpoint; silently
            // auto-naming a bulk group would diverge from that contract.
            'name' => ['prohibited'],
            'count' => ['required', 'integer', 'min:1', 'max:200'],
            'capacity' => ['sometimes', 'integer', 'min:'.$rules['min_members'], 'max:'.$rules['max_members']],
            'random_names' => ['sometimes', 'boolean'],
        ]);

        $count = (int) $data['count'];
        $names = GroupNamer::batch($session, $count, (bool) ($data['random_names'] ?? false));

        $groups = DB::transaction(function () use ($session, $names, $data): array {
            return array_map(
                fn (string $name): Group => $session->groups()->create([
                    'name' => $name,
                    'capacity' => $data['capacity'] ?? null,
                    'field_values' => [],
                ]),
                $names,
            );
        });

        foreach ($groups as $group) {
            broadcast(new GroupCreated($session, $group))->toOthers();
        }

        $recorder->record($session, 'groups_created', [
            'count' => count($groups),
            'group_ids' => array_map(fn (Group $group): int => $group->id, $groups),
            'names' => array_map(fn (Group $group): string => $group->name, $groups),
            'by' => 'admin',
        ]);

        return response()->json([
            'ok' => true,
            'count' => count($groups),
            'group_ids' => array_map(fn (Group $group): int => $group->id, $groups),
            'names' => array_map(fn (Group $group): string => $group->name, $groups),
        ]);
    }

    /** Force-move a member to another group or back to the pool (kick). */
    public function move(Request $request, Session $session, Participant $participant, EventRecorder $recorder): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        abort_unless($participant->group_session_id === $session->id, 404);

        $toGroupId = $request->validate(['to_group_id' => ['nullable', 'integer', 'exists:groups,id']])['to_group_id'] ?? null;

        if ($toGroupId !== null) {
            /** @var Group $target */
            $target = Group::query()->findOrFail($toGroupId);
            abort_unless($target->group_session_id === $session->id, 404);
        }

        $targetGroupId = DB::transaction(function () use ($session, $participant, $toGroupId) {
            $membership = Membership::query()
                ->where('participant_id', $participant->id)
                ->where('status', 'active')
                ->first();

            $sourceGroupId = null;
            if ($membership !== null) {
                $sourceGroupId = $membership->group_id;
                $this->releaseSeat($membership);
            }

            if ($toGroupId !== null) {
                /** @var Group $target */
                $target = Group::query()->lockForUpdate()->findOrFail($toGroupId);
                if ($target->openSlots($session) <= 0) {
                    throw ValidationException::withMessages(['to_group_id' => 'Target group is full.']);
                }
                $target->memberships()->create([
                    'participant_id' => $participant->id,
                    'role' => 'member',
                    'status' => 'active',
                ]);

                return $toGroupId;
            }

            return 0; // pool
        });

        broadcast(new MembershipChanged($session, (int) $targetGroupId, 'moved'))->toOthers();
        $recorder->record($session, 'member_moved', ['participant' => $participant->name, 'to_group_id' => $targetGroupId === 0 ? null : $targetGroupId]);

        return response()->json(['ok' => true, 'to_group_id' => $targetGroupId === 0 ? null : $targetGroupId]);
    }

    /** Dissolve one group or all groups — everyone back to the pool. */
    public function dissolve(Request $request, Session $session, EventRecorder $recorder): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $groupId = $request->validate(['group_id' => ['nullable', 'integer', 'exists:groups,id']])['group_id'] ?? null;

        if ($groupId !== null) {
            /** @var Group $group */
            $group = Group::query()->findOrFail($groupId);
            abort_unless($group->group_session_id === $session->id, 404);
        }

        $affected = DB::transaction(function () use ($session, $groupId) {
            $query = Membership::query()->where('status', 'active');
            if ($groupId !== null) {
                $query->where('group_id', $groupId);
            } else {
                $query->whereIn('group_id', $session->groups()->pluck('id'));
            }

            $count = $query->count();
            $query->delete();

            $affectedGroups = Group::query()->where('group_session_id', $session->id);
            if ($groupId !== null) {
                $affectedGroups->where('id', $groupId);
            }
            $affectedGroups->update(['leader_id' => null]);

            return $count;
        });

        broadcast(new MembershipChanged($session, (int) ($groupId ?? 0), 'dissolved'))->toOthers();
        $recorder->record($session, 'groups_dissolved', ['group_id' => $groupId, 'affected' => $affected]);

        return response()->json(['ok' => true, 'affected' => $affected]);
    }

    /** Ban or unban a participant (CAP-10): banned = kicked from all groups, joins blocked. */
    public function ban(Request $request, Session $session, Participant $participant, EventRecorder $recorder): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        abort_unless($participant->group_session_id === $session->id, 404);

        $banned = $request->validate(['banned' => ['required', 'boolean']])['banned'];

        $participant->update(['banned_at' => $banned ? now() : null]);

        if ($banned) {
            $affectedGroups = Membership::query()
                ->where('participant_id', $participant->id)
                ->where('status', 'active')
                ->get();

            foreach ($affectedGroups as $membership) {
                $membership->delete();
                $result = app(GroupLeadershipService::class)->rebalanceAfterRemoval($membership->group);
                broadcast(new MembershipChanged($session, $membership->group_id, $result === GroupLeadershipService::DISSOLVED ? 'dissolved' : 'left'))->toOthers();
            }
        }

        $recorder->record($session, $banned ? 'participant_banned' : 'participant_unbanned', ['name' => $participant->name]);

        return response()->json(['ok' => true, 'banned' => $banned]);
    }

    /** Proxy mode (CAP-11): bulk-create unclaimed named seats (field trips). */
    public function createParticipants(Request $request, Session $session, EventRecorder $recorder): JsonResponse
    {
        $this->authorizeAdmin($session, $request);
        abort_unless($session->config->hasPlugin('proxy'), 404);

        $raw = $request->validate([
            'names' => ['required', 'array', 'max:200'],
            'names.*' => ['string', 'max:80'],
        ])['names'];

        $names = [];
        $seen = [];
        foreach ($raw as $n) {
            $n = trim((string) $n);
            $key = mb_strtolower($n);
            if ($n === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $names[] = $n;
        }

        $taken = Participant::query()
            ->where('group_session_id', $session->id)
            ->get()
            ->map(fn ($p) => mb_strtolower($p->name))
            ->all();

        $created = 0;
        foreach ($names as $name) {
            $key = mb_strtolower($name);
            if (in_array($key, $taken, true)) {
                continue;
            }

            Participant::query()->create([
                'group_session_id' => $session->id,
                'name' => $name,
                'avatar_style' => 'initials',
                'avatar_seed' => Str::random(16),
                'token' => null,
            ]);
            $taken[] = $key;
            $created++;
        }

        $recorder->record($session, 'proxied_seats_created', ['count' => $created]);

        return response()->json(['ok' => true, 'created' => $created]);
    }

    /** Admin: transfer a group's leadership to an active member (CAP-10). */
    public function transferLeadership(Request $request, Session $session, Group $group, EventRecorder $recorder): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        abort_unless($group->group_session_id === $session->id, 404);

        $participantId = (int) $request->validate(['participant_id' => ['required', 'integer']])['participant_id'];

        $membership = Membership::query()
            ->where('group_id', $group->id)
            ->where('participant_id', $participantId)
            ->where('status', 'active')
            ->first();

        if ($membership === null) {
            throw ValidationException::withMessages(['participant_id' => 'Not an active member of this group.']);
        }

        Membership::query()->where('group_id', $group->id)->where('role', 'leader')->update(['role' => 'member']);
        $membership->update(['role' => 'leader']);
        $group->update(['leader_id' => $participantId]);

        broadcast(new MembershipChanged($session, $group->id, 'leader_changed'))->toOthers();
        $recorder->record($session, 'leadership_transferred', ['group_id' => $group->id]);

        return response()->json(['ok' => true]);
    }

    /** Assign or clear a session custom role (CAP-7). */
    public function assignRole(Request $request, Session $session, Participant $participant): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        abort_unless($participant->group_session_id === $session->id, 404);

        $role = $request->validate(['role' => ['nullable', 'string', 'max:40']])['role'] ?? null;

        if ($role !== null && ! array_key_exists($role, $session->config->roles())) {
            throw ValidationException::withMessages(['role' => 'Unknown role: '.$role]);
        }

        $participant->update(['custom_role' => $role]);

        return response()->json(['ok' => true, 'custom_role' => $role]);
    }

    /** Auto-distribute all pooled participants into groups with space (mockup Auto-Distribute). */
    public function distribute(Request $request, Session $session): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $groups = Group::query()->where('group_session_id', $session->id)->get();
        $pooled = Participant::query()
            ->where('group_session_id', $session->id)
            ->whereNotIn('id', Membership::query()->where('status', 'active')->pluck('participant_id'))
            ->orderBy('name')
            ->get();

        $assigned = DB::transaction(function () use ($groups, $pooled, $session) {
            $slots = $groups->mapWithKeys(fn (Group $g) => [$g->id => $g->openSlots($session)])->all();
            $count = 0;

            foreach ($pooled as $participant) {
                arsort($slots);
                $groupId = array_key_first($slots);

                if ($groupId === null || $slots[$groupId] <= 0) {
                    break;
                }

                Membership::query()->create([
                    'group_id' => $groupId,
                    'participant_id' => $participant->id,
                    'role' => 'member',
                    'status' => 'active',
                ]);
                $slots[$groupId]--;
                $count++;
            }

            return $count;
        });

        if ($assigned > 0) {
            broadcast(new MembershipChanged($session, 0, 'auto_distributed'))->toOthers();
        }

        return response()->json(['ok' => true, 'assigned' => $assigned]);
    }

    /** Delete the member's active seat; transfer leadership if they led (CAP-10). */
    private function releaseSeat(Membership $membership): void
    {
        $group = $membership->group;
        $wasLeader = $membership->role === 'leader';
        $membership->delete();

        if ($wasLeader) {
            app(GroupLeadershipService::class)->rebalanceAfterRemoval($group);
        }
    }
}
