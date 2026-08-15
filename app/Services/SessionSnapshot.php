<?php

namespace App\Services;

use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\QuizAnswer;
use App\Models\QuizRun;
use App\Models\Session;
use Illuminate\Support\Carbon;

/**
 * One server-computed snapshot of a session's live board (CAP-3).
 * AD-6: clients render from this snapshot and resync on reconnect.
 */
class SessionSnapshot
{
    /**
     * @return array<string, mixed>
     */
    public function build(Session $session, ?Participant $me, bool $admin = false): array
    {
        $groups = $session->groups()
            ->withCount(['memberships as member_count' => fn ($q) => $q->where('status', 'active')])
            ->orderBy('name')
            ->get();

        $groupIds = $groups->pluck('id');
        $activeMemberIds = Membership::query()
            ->whereIn('group_id', $groupIds)
            ->where('status', 'active')
            ->pluck('participant_id');

        $anonymous = $session->config->rules()['anonymous_mode'] ?? false;

        $pool = Participant::query()
            ->where('group_session_id', $session->id)
            ->whereNotIn('id', $activeMemberIds)
            ->orderBy('name')
            ->get(['id', 'name', 'display_name', 'custom_role']);

        $quiz = null;
        $run = QuizRun::query()->where('group_session_id', $session->id)->latest('id')->first();
        if ($run !== null && $session->config->quiz() !== [] && $session->config->hasPlugin('quiz')) {
            $questions = $session->config->quiz();
            $answers = QuizAnswer::query()->where('group_session_id', $session->id)->get();

            $quiz = [
                'status' => $run->status,
                'current_index' => $run->current_index,
                'total' => count($questions),
                'question' => $admin
                    ? ($questions[$run->current_index] ?? null)
                    : array_diff_key($questions[$run->current_index] ?? [], ['answer' => true]),
                'my_answer' => $me === null ? null : (function () use ($me, $answers, $run) {
                    $gid = Membership::query()
                        ->where('participant_id', $me->id)
                        ->where('status', 'active')
                        ->value('group_id');

                    return $gid === null ? null : $answers
                        ->where('group_id', $gid)
                        ->where('question_index', $run->current_index)
                        ->value('answer_index');
                })(),
                'leaderboard' => $session->groups()
                    ->withCount('memberships')
                    ->get()
                    ->map(function (Group $group) use ($answers) {
                        return [
                            'group_id' => $group->id,
                            'name' => $group->name,
                            'points' => (int) $answers->where('group_id', $group->id)->sum('points'),
                            'answered' => (int) $answers->where('group_id', $group->id)->count(),
                        ];
                    })
                    ->sortByDesc('points')
                    ->values()
                    ->all(),
            ];
        }

        return [
            'quiz' => $quiz,
            'code' => $session->code,
            'status' => $session->status,
            'dissolve_at' => $session->dissolve_at !== null ? Carbon::parse($session->dissolve_at)->toIso8601String() : null,
            'config' => $admin ? $session->config->toArray() : $session->config->publicView(),
            'presence' => Participant::query()->where('group_session_id', $session->id)->count(),
            'pool' => $pool->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->display_name ?? $p->name,
                'custom_role' => $p->custom_role,
            ])->values(),
            'groups' => $groups->map(fn (Group $group) => [
                'id' => $group->id,
                'name' => $group->name,
                'leader_id' => $group->leader_id,
                'member_count' => (int) $group->member_count,
                'capacity' => $group->effectiveCapacity($session),
                'open_slots' => $group->openSlots($session),
                'field_values' => $group->field_values,
                'members' => $group->memberships()
                    ->with('participant')
                    ->where('status', 'active')
                    ->get()
                    ->map(function (Membership $m) use ($anonymous, $admin): array {
                        /** @var array{id: int, name: string, real_name: string|null, role: string, custom_role: string|null} $member */
                        $member = [
                            'id' => $m->participant_id,
                            'name' => $m->participant->display_name ?? $m->participant->name,
                            'real_name' => $anonymous && $admin ? $m->participant->name : null,
                            'role' => $m->role,
                            'custom_role' => $m->participant->custom_role,
                        ];

                        return $member;
                    })
                    ->values()
                    ->all(),
                'pending' => $group->memberships()
                    ->with('participant')
                    ->where('status', 'pending')
                    ->get()
                    ->map(function (Membership $m) use ($admin) {
                        return [
                            'id' => $m->participant_id,
                            'name' => $m->participant->display_name ?? $m->participant->name,
                            'real_name' => $admin ? $m->participant->name : null,
                        ];
                    })
                    ->values()
                    ->all(),
            ])->values(),
            'me' => $me === null ? null : [
                'id' => $me->id,
                'name' => $me->display_name ?? $me->name,
                'real_name' => $anonymous ? $me->name : null,
                'pooled' => ! $activeMemberIds->contains($me->id),
            ],
        ];
    }
}
