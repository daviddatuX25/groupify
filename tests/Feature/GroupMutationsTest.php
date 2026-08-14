<?php

use App\Events\GroupCreated;
use App\Events\MembershipChanged;
use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use App\Support\SessionConfig;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->me = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Maya']);
    $this->headers = ['X-Device-Token' => $this->me->token, 'Accept' => 'application/json'];
});

function routeStore(Session $s): string
{
    return route('groups.store', $s);
}

it('creates a group with auto name and leader membership', function () {
    Event::fake([GroupCreated::class]);

    $this->postJson(routeStore($this->session), [], $this->headers)->assertOk();

    $group = Group::query()->sole();

    expect($group->name)->toBe('Team Alpha')
        ->and($group->leader_id)->toBe($this->me->id);

    $membership = Membership::query()->sole();
    expect($membership->participant_id)->toBe($this->me->id)
        ->and($membership->role)->toBe('leader');

    Event::assertDispatched(GroupCreated::class);
});

it('auto-names sequentially across groups', function () {
    Group::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Team Alpha']);

    $this->postJson(routeStore($this->session), [], $this->headers)->assertOk();

    expect(Group::query()->latest('id')->first()->name)->toBe('Team Bravo');
});

it('uses the table naming scheme when configured', function () {
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), ['rules' => ['naming' => 'table']])]);

    $this->postJson(routeStore($this->session), [], $this->headers)->assertOk();

    expect(Group::query()->sole()->name)->toBe('Table 1');
});

it('accepts a custom name and stores required fields', function () {
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'fields' => [['name' => 'Chosen topic', 'type' => 'text', 'required' => true, 'filled_by' => 'leader']],
    ])]);

    $this->postJson(routeStore($this->session), [
        'name' => 'AI Team',
        'field_values' => ['Chosen topic' => 'AI Healthcare App'],
    ], $this->headers)->assertOk();

    $group = Group::query()->sole();
    expect($group->name)->toBe('AI Team')
        ->and($group->field_values)->toBe(['Chosen topic' => 'AI Healthcare App']);
});

it('blocks creation when a required field is missing', function () {
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'fields' => [['name' => 'Chosen topic', 'type' => 'text', 'required' => true, 'filled_by' => 'leader']],
    ])]);

    $this->postJson(routeStore($this->session), [], $this->headers)
        ->assertStatus(422)->assertJsonValidationErrors('field_values.Chosen topic');
});

it('blocks creation when frozen or not pooled', function () {
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), ['rules' => ['freeze' => true]])]);
    $this->postJson(routeStore($this->session), [], $this->headers)->assertNotFound();

    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), ['rules' => ['freeze' => false]])]);
    $group = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $this->me->id]);
    $group->memberships()->create(['participant_id' => $this->me->id, 'role' => 'leader']);

    $this->postJson(routeStore($this->session), [], $this->headers)->assertStatus(422);
});

it('joins an open group transactionally with capacity and freeze checks', function () {
    $group = Group::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Team Alpha']);

    $this->postJson(route('groups.join', [$this->session, $group]), [], $this->headers)->assertOk();

    expect(Membership::query()->where('participant_id', $this->me->id)->count())->toBe(1);

    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), ['rules' => ['freeze' => true]])]);
    $other = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $this->postJson(route('groups.join', [$this->session, $group]), [], ['X-Device-Token' => $other->token, 'Accept' => 'application/json'])
        ->assertNotFound();
});

it('rejects joining a full group or a second group', function () {
    $config = array_replace_recursive(SessionConfig::defaults(), ['rules' => ['max_members' => 1]]);
    $this->session->update(['config' => $config]);
    $full = Group::factory()->create(['group_session_id' => $this->session->id]);
    $leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $full->memberships()->create(['participant_id' => $leader->id, 'role' => 'leader']);

    $this->postJson(route('groups.join', [$this->session, $full]), [], $this->headers)->assertStatus(422);

    $otherGroup = Group::factory()->create(['group_session_id' => $this->session->id]);
    $otherGroup->memberships()->create(['participant_id' => $this->me->id, 'role' => 'member']);

    $this->postJson(route('groups.join', [$this->session, $otherGroup]), [], $this->headers)->assertStatus(422);
});

it('leaves a group and returns to the pool', function () {
    $group = Group::factory()->create(['group_session_id' => $this->session->id]);
    $group->memberships()->create(['participant_id' => $this->me->id, 'role' => 'member']);

    $this->postJson(route('groups.leave', [$this->session, $group]), [], $this->headers)->assertOk();

    expect(Membership::query()->count())->toBe(0);
});

it('transfers leadership to the next-joined member when the leader leaves', function () {
    $group = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $this->me->id]);
    $group->memberships()->create(['participant_id' => $this->me->id, 'role' => 'leader']);
    $next = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Leo']);
    $group->memberships()->create(['participant_id' => $next->id, 'role' => 'member']);

    $this->postJson(route('groups.leave', [$this->session, $group]), [], $this->headers)->assertOk();

    $group->refresh();
    expect($group->leader_id)->toBe($next->id)
        ->and($group->memberships()->where('participant_id', $next->id)->first()->role)->toBe('leader');
});

it('broadcasts membership changes', function () {
    Event::fake([MembershipChanged::class]);
    $group = Group::factory()->create(['group_session_id' => $this->session->id]);

    $this->postJson(route('groups.join', [$this->session, $group]), [], $this->headers)->assertOk();

    Event::assertDispatched(MembershipChanged::class);
});

it('requires a valid device token for mutations', function () {
    $this->postJson(routeStore($this->session), [], ['Accept' => 'application/json'])->assertStatus(422);
});
