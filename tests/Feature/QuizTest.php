<?php

use App\Http\Controllers\QuizController;
use App\Models\Group;
use App\Models\Participant;
use App\Models\QuizRun;
use App\Models\Session;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->adminHeaders = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];

    $this->questions = [
        ['q' => 'Capital of France?', 'options' => ['Paris', 'Lyon', 'Nice', 'Marseille'], 'answer' => 0, 'points' => 10],
        ['q' => '2 + 2 = ?', 'options' => ['3', '4', '5', '6'], 'answer' => 1, 'points' => 5],
    ];

    $this->leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $this->group = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $this->leader->id]);
    $this->group->memberships()->create(['participant_id' => $this->leader->id, 'role' => 'leader']);
    $this->leaderHeaders = ['X-Device-Token' => $this->leader->token, 'Accept' => 'application/json'];
});

function startQuiz($session, array $questions): void
{
    $session->update(['config' => array_replace_recursive($session->config->toArray(), ['plugins' => ['quiz'], 'quiz' => ['questions' => $questions]])]);
    QuizRun::query()->create([
        'group_session_id' => $session->id,
        'status' => 'live',
        'current_index' => 0,
    ]);
}

it('saves quiz questions into the session config', function () {
    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), ['plugins' => ['quiz']])]);
    $this->putJson(route('admin.quiz.save', $this->session), ['questions' => $this->questions], $this->adminHeaders)
        ->assertOk();

    expect($this->session->fresh()->config->quiz())->toHaveCount(2);
});

it('starts a live quiz run', function () {
    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), ['plugins' => ['quiz'], 'quiz' => ['questions' => $this->questions]])]);

    $this->postJson(route('admin.quiz.start', $this->session), [], $this->adminHeaders)->assertOk();

    $run = QuizRun::query()->where('group_session_id', $this->session->id)->latest('id')->first();

    expect($run->status)->toBe('live')->and($run->current_index)->toBe(0);
});

it('grades a leaders answer and awards points', function () {
    startQuiz($this->session, $this->questions);

    $this->postJson(route('quiz.answer', [$this->session, $this->group]), [
        'question_index' => 0,
        'answer_index' => 0,
    ], $this->leaderHeaders)->assertOk()->assertJsonPath('points', 10);

    $this->assertDatabaseHas('quiz_answers', [
        'group_session_id' => $this->session->id,
        'group_id' => $this->group->id,
        'question_index' => 0,
        'answer_index' => 0,
        'points' => 10,
    ]);
});

it('awards zero points for a wrong answer but still records it', function () {
    startQuiz($this->session, $this->questions);

    $this->postJson(route('quiz.answer', [$this->session, $this->group]), [
        'question_index' => 0,
        'answer_index' => 2,
    ], $this->leaderHeaders)->assertOk()->assertJsonPath('points', 0);

    $this->assertDatabaseHas('quiz_answers', ['group_id' => $this->group->id, 'question_index' => 0, 'points' => 0]);
});

it('rejects a second answer for the same question', function () {
    startQuiz($this->session, $this->questions);

    $g2Leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $g2 = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $g2Leader->id]);
    $g2->memberships()->create(['participant_id' => $g2Leader->id, 'role' => 'leader']);

    $this->postJson(route('quiz.answer', [$this->session, $this->group]), ['question_index' => 0, 'answer_index' => 0], $this->leaderHeaders)->assertOk();
    $this->postJson(route('quiz.answer', [$this->session, $this->group]), ['question_index' => 0, 'answer_index' => 1], $this->leaderHeaders)
        ->assertStatus(422);
});

it('rejects answers from non-leaders', function () {
    startQuiz($this->session, $this->questions);

    $other = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $this->group->memberships()->create(['participant_id' => $other->id, 'role' => 'member']);

    $this->postJson(route('quiz.answer', [$this->session, $this->group]), ['question_index' => 0, 'answer_index' => 0], [
        'X-Device-Token' => $other->token,
        'Accept' => 'application/json',
    ])->assertNotFound();
});

it('auto-advances when all active groups have answered', function () {
    startQuiz($this->session, $this->questions);

    $g2Leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $g2 = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $g2Leader->id]);
    $g2->memberships()->create(['participant_id' => $g2Leader->id, 'role' => 'leader']);

    $this->postJson(route('quiz.answer', [$this->session, $this->group]), ['question_index' => 0, 'answer_index' => 0], $this->leaderHeaders)->assertOk();

    $run = QuizRun::query()->where('group_session_id', $this->session->id)->latest('id')->first();
    expect($run->current_index)->toBe(0);

    $this->postJson(route('quiz.answer', [$this->session, $g2]), ['question_index' => 0, 'answer_index' => 1], [
        'X-Device-Token' => $g2Leader->token,
        'Accept' => 'application/json',
    ])->assertOk();

    $run->refresh();
    expect($run->current_index)->toBe(1);
});

it('finishes the run after the last question', function () {
    startQuiz($this->session, $this->questions);

    $g2Leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $g2 = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $g2Leader->id]);
    $g2->memberships()->create(['participant_id' => $g2Leader->id, 'role' => 'leader']);

    foreach ([[$this->group, $this->leader], [$g2, $g2Leader]] as [$group, $leader]) {
        $this->postJson(route('quiz.answer', [$this->session, $group]), ['question_index' => 0, 'answer_index' => 0], [
            'X-Device-Token' => $leader->token,
            'Accept' => 'application/json',
        ])->assertOk();
    }

    $this->postJson(route('quiz.answer', [$this->session, $this->group]), ['question_index' => 1, 'answer_index' => 1], $this->leaderHeaders)->assertOk();
    $this->postJson(route('quiz.answer', [$this->session, $g2]), ['question_index' => 1, 'answer_index' => 0], [
        'X-Device-Token' => $g2Leader->token,
        'Accept' => 'application/json',
    ])->assertOk();

    $run = QuizRun::query()->where('group_session_id', $this->session->id)->latest('id')->first();

    expect($run->status)->toBe('done');
});

it('exposes the quiz state and leaderboard in the snapshot', function () {
    startQuiz($this->session, $this->questions);

    $g2Leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $g2 = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $g2Leader->id]);
    $g2->memberships()->create(['participant_id' => $g2Leader->id, 'role' => 'leader']);

    $this->postJson(route('quiz.answer', [$this->session, $this->group]), ['question_index' => 0, 'answer_index' => 0], $this->leaderHeaders)->assertOk();

    $snapshot = $this->getJson(route('board.show', $this->session), $this->leaderHeaders)->assertOk()->json();

    expect($snapshot['quiz']['status'])->toBe('live')
        ->and($snapshot['quiz']['current_index'])->toBe(0)
        ->and($snapshot['quiz']['question']['q'])->toBe('Capital of France?')
        ->and($snapshot['quiz']['my_answer'])->toBe(0)
        ->and($snapshot['quiz']['leaderboard'][0]['points'])->toBe(10);
});

it('requires an admin token for quiz administration', function () {
    $this->postJson(route('admin.quiz.start', $this->session))->assertNotFound();
    $this->putJson(route('admin.quiz.save', $this->session), ['questions' => $this->questions])->assertNotFound();
});

it('never ships the correct answer in the quiz.updated broadcast payload', function () {
    startQuiz($this->session, $this->questions);

    $run = QuizRun::query()->where('group_session_id', $this->session->id)->latest('id')->first();

    $state = app(QuizController::class)->quizState($this->session, $run);

    expect($state['question'])->not->toHaveKey('answer')
        ->and($state['question']['q'])->toBe('Capital of France?')
        ->and($state['question']['options'])->toHaveCount(4);
});

it('replaces the question set when saving a shorter quiz', function () {
    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), ['plugins' => ['quiz']])]);
    $this->putJson(route('admin.quiz.save', $this->session), ['questions' => [$this->questions[0]]], $this->adminHeaders)->assertOk();

    expect($this->session->fresh()->config->quiz())->toHaveCount(1);
});
