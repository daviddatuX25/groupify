<?php

use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\QuizRun;
use App\Models\Session;
use App\Support\SessionConfig;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->adminHeaders = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
});

it('never ships quiz answers or private config to public board fetchers', function () {
    $questions = [
        ['q' => 'Secret?', 'options' => ['A', 'B'], 'answer' => 1, 'points' => 10],
    ];
    $this->session->update(['config' => SessionConfig::deepMerge($this->session->config->toArray(), [
        'extensions' => ['quiz'],
        'quiz' => ['questions' => $questions],
        'perms' => ['announce' => ['member' => true]],
    ])]);
    QuizRun::query()->create(['group_session_id' => $this->session->id, 'status' => 'live', 'current_index' => 0]);

    $public = $this->getJson(route('board.show', $this->session))->assertOk()->json();
    $admin = $this->getJson(route('board.show', $this->session), $this->adminHeaders)->assertOk()->json();

    expect($public['quiz']['question'])->not->toHaveKey('answer')
        ->and($public['config'])->not->toHaveKey('perms')
        ->and($public['config'])->not->toHaveKey('quiz')
        ->and($public['config'])->not->toHaveKey('roles')
        ->and($public['config']['rules'])->toHaveKey('chat_enabled')
        ->and($admin['quiz']['question'])->toHaveKey('answer');
});

it('hides real names from the pending list in anonymous mode', function () {
    $this->session->update(['config' => SessionConfig::deepMerge($this->session->config->toArray(), [
        'rules' => ['anonymous_mode' => true],
    ])]);

    $leader = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Maya']);
    $group = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $leader->id]);
    $group->memberships()->create(['participant_id' => $leader->id, 'role' => 'leader']);

    $requester = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Ana Maria', 'display_name' => 'Falcon']);
    $group->memberships()->create(['participant_id' => $requester->id, 'role' => 'member', 'status' => 'pending']);

    $snapshot = $this->getJson(route('board.show', $this->session))->assertOk()->json();

    expect($snapshot['groups'][0]['pending'][0]['name'])->toBe('Falcon')
        ->and($snapshot['groups'][0]['pending'][0]['real_name'])->toBeNull();
});

it('blocks approval that would overfill a group or double-seat a participant', function () {
    $leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $group = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $leader->id, 'capacity' => 1]);
    $group->memberships()->create(['participant_id' => $leader->id, 'role' => 'leader']);

    $requester = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $group->memberships()->create(['participant_id' => $requester->id, 'role' => 'member', 'status' => 'pending']);

    $this->postJson(route('groups.approve', [$this->session, $group, $requester]), [], [
        'X-Device-Token' => $leader->token,
        'Accept' => 'application/json',
    ])->assertStatus(422);

    expect(Membership::query()->where('participant_id', $requester->id)->value('status'))->toBe('pending');
});

it('scopes dissolve leadership cleanup to the dissolved group', function () {
    $l1 = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $g1 = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $l1->id]);
    $g1->memberships()->create(['participant_id' => $l1->id, 'role' => 'leader']);

    $l2 = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $g2 = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $l2->id]);
    $g2->memberships()->create(['participant_id' => $l2->id, 'role' => 'leader']);

    $this->postJson(route('admin.dissolve', $this->session), ['group_id' => $g1->id], $this->adminHeaders)->assertOk();

    expect($g1->fresh()->leader_id)->toBeNull()
        ->and($g2->fresh()->leader_id)->toBe($l2->id);
});

it('prefixes formula-like cells in the CSV export', function () {
    $p = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => '=SUM(A1:A9)', 'email' => 'x@y.z']);

    $response = $this->getJson(route('admin.export', $this->session), $this->adminHeaders)->assertOk();
    $csv = $response->streamedContent();

    expect($csv)->toContain("'=SUM(A1:A9)");
});

it('rejects out-of-range quiz answers and frozen sessions', function () {
    $this->session->update(['config' => SessionConfig::deepMerge($this->session->config->toArray(), [
        'extensions' => ['quiz'],
        'quiz' => ['questions' => [
            ['q' => 'Pick one', 'options' => ['A', 'B'], 'answer' => 0, 'points' => 5],
        ]],
    ])]);
    QuizRun::query()->create(['group_session_id' => $this->session->id, 'status' => 'live', 'current_index' => 0]);

    $leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $group = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $leader->id]);
    $group->memberships()->create(['participant_id' => $leader->id, 'role' => 'leader']);
    $headers = ['X-Device-Token' => $leader->token, 'Accept' => 'application/json'];

    $this->postJson(route('quiz.answer', [$this->session, $group]), ['question_index' => 0, 'answer_index' => 9], $headers)->assertStatus(422);
    $this->assertDatabaseMissing('quiz_answers', ['group_id' => $group->id]);

    $this->session->update(['status' => 'frozen']);
    $this->postJson(route('quiz.answer', [$this->session, $group]), ['question_index' => 0, 'answer_index' => 0], $headers)->assertNotFound();
});

it('replaces list config so removed entries actually go away', function () {
    $config = SessionConfig::deepMerge([], ['rules' => ['guest_list' => ['Ana', 'Ben', 'Cai']]]);
    $pruned = SessionConfig::deepMerge($config, ['rules' => ['guest_list' => ['Ana', 'Cai']]]);

    expect($pruned['rules']['guest_list'])->toBe(['Ana', 'Cai']);
});
