<?php

use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->leader = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Maya']);
    $this->group = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $this->leader->id]);
    $this->group->memberships()->create(['participant_id' => $this->leader->id, 'role' => 'leader']);
    $this->member = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Leo']);
    $this->group->memberships()->create(['participant_id' => $this->member->id, 'role' => 'member']);

    $this->leaderHeaders = ['X-Device-Token' => $this->leader->token, 'Accept' => 'application/json'];
    $this->adminHeaders = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
});

it('lets the group leader kick a member back to the pool', function () {
    $this->postJson(route('groups.kick', [$this->session, $this->group, $this->member]), [], $this->leaderHeaders)->assertOk();

    expect(Membership::query()->where('participant_id', $this->member->id)->count())->toBe(0)
        ->and(Participant::query()->where('id', $this->member->id)->first()->name)->toBe('Leo');
});

it('rejects kicks from non-leaders', function () {
    $other = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $this->postJson(route('groups.kick', [$this->session, $this->group, $this->member]), [], [
        'X-Device-Token' => $other->token,
        'Accept' => 'application/json',
    ])->assertNotFound();

    expect(Membership::query()->where('participant_id', $this->member->id)->count())->toBe(1);
});

it('lets the admin ban a participant: kicked from groups and join blocked', function () {
    $this->postJson(route('admin.members.ban', [$this->session, $this->member]), ['banned' => true], $this->adminHeaders)->assertOk();

    expect(Membership::query()->where('participant_id', $this->member->id)->count())->toBe(0)
        ->and($this->member->fresh()->banned_at)->not->toBeNull();

    $this->postJson(route('join.store', $this->session), [
        'pin' => $this->session->pin,
        'name' => 'Leo',
        'device_token' => (string) Str::uuid(),
    ])->assertStatus(422)->assertJsonValidationErrors('name');
});

it('unbans a participant who can then rejoin', function () {
    $this->postJson(route('admin.members.ban', [$this->session, $this->member]), ['banned' => true], $this->adminHeaders)->assertOk();
    $this->postJson(route('admin.members.ban', [$this->session, $this->member]), ['banned' => false], $this->adminHeaders)->assertOk();

    expect($this->member->fresh()->banned_at)->toBeNull();

    $this->postJson(route('join.store', $this->session), [
        'pin' => $this->session->pin,
        'name' => 'Leo',
        'device_token' => (string) Str::uuid(),
    ])->assertRedirect();
});

it('rejects ban actions without an admin token', function () {
    $this->postJson(route('admin.members.ban', [$this->session, $this->member]), ['banned' => true])->assertNotFound();
});
