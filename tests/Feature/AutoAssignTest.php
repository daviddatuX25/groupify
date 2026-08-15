<?php

use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use App\Support\SessionConfig;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->session->update(['config' => SessionConfig::deepMerge($this->session->config->toArray(), ['plugins' => ['match_me']])]);
});

it('auto-distributes all pooled participants into groups with space', function () {
    $groups = Group::factory()->count(2)->create(['group_session_id' => $this->session->id]);
    Participant::factory()->count(4)->create(['group_session_id' => $this->session->id]);

    $this->postJson(route('admin.auto-distribute', $this->session), [], [
        'X-Admin-Token' => $this->session->admin_token,
        'Accept' => 'application/json',
    ])->assertOk();

    expect(Membership::query()->where('status', 'active')->count())->toBe(4);
    foreach ($groups as $group) {
        expect($group->memberships()->where('status', 'active')->count())->toBe(2); // even split
    }
});

it('never exceeds group capacity when distributing', function () {
    $config = $this->session->config->toArray();
    $config['rules']['max_members'] = 1;
    $this->session->update(['config' => $config]);
    Group::factory()->count(2)->create(['group_session_id' => $this->session->id]);
    Participant::factory()->count(3)->create(['group_session_id' => $this->session->id]);

    $this->postJson(route('admin.auto-distribute', $this->session), [], [
        'X-Admin-Token' => $this->session->admin_token,
        'Accept' => 'application/json',
    ])->assertOk();

    expect(Membership::query()->where('status', 'active')->count())->toBe(2) // capacity: 1 × 2 groups
        ->and(Participant::query()->whereNotIn('id', Membership::query()->pluck('participant_id'))->count())->toBe(1);
});

it('requires the admin token for auto-distribute', function () {
    $this->postJson(route('admin.auto-distribute', $this->session))->assertNotFound();
});

it('matches a participant into the least-full group', function () {
    $full = Group::factory()->create(['group_session_id' => $this->session->id]);
    $empty = Group::factory()->create(['group_session_id' => $this->session->id]);
    $leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $full->memberships()->create(['participant_id' => $leader->id, 'role' => 'leader']);

    $me = Participant::factory()->create(['group_session_id' => $this->session->id]);

    $this->postJson(route('match-me', $this->session), [], [
        'X-Device-Token' => $me->token,
        'Accept' => 'application/json',
    ])->assertOk();

    expect(Membership::query()->where('participant_id', $me->id)->sole()->group_id)->toBe($empty->id);
});

it('rejects match-me when already grouped or the session is frozen', function () {
    $group = Group::factory()->create(['group_session_id' => $this->session->id]);
    $me = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $group->memberships()->create(['participant_id' => $me->id, 'role' => 'member']);

    $this->postJson(route('match-me', $this->session), [], [
        'X-Device-Token' => $me->token,
        'Accept' => 'application/json',
    ])->assertStatus(422);

    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), ['rules' => ['freeze' => true]])]);
    $other = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $this->postJson(route('match-me', $this->session), [], [
        'X-Device-Token' => $other->token,
        'Accept' => 'application/json',
    ])->assertNotFound();
});

it('reports no eligible group when everything is full', function () {
    $config = $this->session->config->toArray();
    $config['rules']['max_members'] = 1;
    $this->session->update(['config' => $config]);
    $group = Group::factory()->create(['group_session_id' => $this->session->id]);
    $leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $group->memberships()->create(['participant_id' => $leader->id, 'role' => 'leader']);

    $me = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $this->postJson(route('match-me', $this->session), [], [
        'X-Device-Token' => $me->token,
        'Accept' => 'application/json',
    ])->assertStatus(422)->assertJsonValidationErrors('group');
});
