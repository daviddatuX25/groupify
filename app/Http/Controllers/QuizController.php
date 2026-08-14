<?php

namespace App\Http\Controllers;

use App\Events\QuizStateUpdated;
use App\Http\Controllers\Admin\AuthorizesAdminToken;
use App\Models\Group;
use App\Models\Participant;
use App\Models\QuizAnswer;
use App\Models\QuizRun;
use App\Models\Session;
use App\Services\PermissionService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class QuizController extends Controller
{
    use AuthorizesAdminToken;

    /** @return array<string, mixed> */
    private function quizState(Session $session, QuizRun $run): array
    {
        $questions = $session->config->quiz();
        $answers = QuizAnswer::query()
            ->where('group_session_id', $session->id)
            ->get();

        $leaderboard = Group::query()
            ->where('group_session_id', $session->id)
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
            ->all();

        return [
            'status' => $run->status,
            'current_index' => $run->current_index,
            'total' => count($questions),
            'question' => $questions[$run->current_index] ?? null,
            'leaderboard' => $leaderboard,
        ];
    }

    /** Admin: save the quiz question set into the session config (CAP-8). */
    public function save(Request $request, Session $session): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $data = $request->validate([
            'questions' => ['required', 'array', 'max:50'],
            'questions.*.q' => ['required', 'string', 'max:200'],
            'questions.*.options' => ['required', 'array', 'min:2', 'max:6'],
            'questions.*.options.*' => ['required', 'string', 'max:80'],
            'questions.*.answer' => ['required', 'integer', 'min:0'],
            'questions.*.points' => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        $session->update(['config' => array_replace_recursive($session->config->toArray(), [
            'quiz' => ['questions' => $data['questions']],
        ])]);

        return response()->json(['ok' => true, 'count' => count($data['questions'])]);
    }

    /** Admin: start a live quiz run (CAP-8). */
    public function start(Request $request, Session $session): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        if ($session->config->quiz() === []) {
            throw ValidationException::withMessages(['questions' => 'Define questions before starting the quiz.']);
        }

        $run = QuizRun::query()->create([
            'group_session_id' => $session->id,
            'status' => 'live',
            'current_index' => 0,
            'started_at' => now(),
        ]);

        broadcast(new QuizStateUpdated($session, $this->quizState($session, $run)));

        return response()->json(['ok' => true]);
    }

    /** Group leader answers the current question; auto-grades and advances (CAP-8). */
    public function answer(Request $request, Session $session, Group $group): JsonResponse
    {
        $token = $request->header('X-Device-Token', $request->query('device_token', ''));
        $me = $token === '' ? null : Participant::query()
            ->where('group_session_id', $session->id)
            ->where('token', $token)
            ->first();

        abort_unless($me !== null && $group->leader_id === $me->id, 404);
        abort_unless($session->status === 'live', 404);
        abort_unless(app(PermissionService::class)->can('answer_quiz', 'leader', $session->config), 404);

        $run = QuizRun::query()
            ->where('group_session_id', $session->id)
            ->where('status', 'live')
            ->latest('id')
            ->first();

        abort_unless($run !== null, 404);

        $input = $request->validate([
            'question_index' => ['required', 'integer', 'min:0'],
            'answer_index' => ['required', 'integer', 'min:0'],
        ]);
        $index = (int) $input['question_index'];
        $questions = $session->config->quiz();

        abort_unless($index === (int) $run->current_index && isset($questions[$index]), 404);

        $answerIndex = (int) $input['answer_index'];
        $question = $questions[$index];

        abort_unless($answerIndex < count($question['options']), 422);

        $already = QuizAnswer::query()
            ->where('group_id', $group->id)
            ->where('question_index', $index)
            ->exists();

        if ($already) {
            throw ValidationException::withMessages(['answer_index' => 'This group already answered.']);
        }

        $correct = $answerIndex === (int) $question['answer'];
        $points = $correct ? (int) $question['points'] : 0;

        try {
            QuizAnswer::query()->create([
                'group_session_id' => $session->id,
                'group_id' => $group->id,
                'participant_id' => $me->id,
                'question_index' => $index,
                'answer_index' => $answerIndex,
                'points' => $points,
            ]);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['answer_index' => 'This group already answered.']);
        }

        // Auto-advance when every active group has answered this question.
        $activeGroups = Group::query()
            ->where('group_session_id', $session->id)
            ->whereHas('memberships', fn ($q) => $q->where('status', 'active'))
            ->count();

        $answeredCount = QuizAnswer::query()
            ->where('group_session_id', $session->id)
            ->where('question_index', $index)
            ->count();

        if ($answeredCount >= $activeGroups && $index < count($questions) - 1) {
            $run->update(['current_index' => $index + 1]);
        } elseif ($answeredCount >= $activeGroups) {
            $run->update(['status' => 'done', 'finished_at' => now()]);
        }

        broadcast(new QuizStateUpdated($session, $this->quizState($session, $run->fresh())));

        return response()->json(['ok' => true, 'points' => $points, 'correct' => $correct]);
    }
}
