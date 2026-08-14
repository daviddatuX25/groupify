<?php

namespace App\Http\Controllers\Admin;

use App\Events\MembershipChanged;
use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use App\Services\EventRecorder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Admin god-mode actions (FR-5.2, FR-5.3). Admin is exempt from the freeze
 * (FR-1.3); token auth via AuthorizesAdminToken; commit then broadcast (AD-1).
 */
class AdminActionsController
{
    use AuthorizesAdminToken;

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
                if ($target->memberships()->where('status', 'active')->count() >= (int) $session->config->rules()['max_members']) {
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
            Group::query()->where('group_session_id', $session->id)->update(['leader_id' => null]);

            return $count;
        });

        broadcast(new MembershipChanged($session, (int) ($groupId ?? 0), 'dissolved'))->toOthers();
        $recorder->record($session, 'groups_dissolved', ['group_id' => $groupId, 'affected' => $affected]);

        return response()->json(['ok' => true, 'affected' => $affected]);
    }

    /** Delete the member's active seat; transfer leadership if they led. */
    private function releaseSeat(Membership $membership): void
    {
        $group = $membership->group;
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
    }
}
