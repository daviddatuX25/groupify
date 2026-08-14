<?php

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
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'rules' => ['join_mode' => 'approval'],
    ])]);
    $this->leader = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Maya']);
    $this->group = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $this->leader->id]);
    $this->group->memberships()->create(['participant_id' => $this->leader->id, 'role' => 'leader', 'status' => 'active']);

    $this->requester = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Leo']);
    $this->requesterHeaders = ['X-Device-Token' => $this->requester->token, 'Accept' => 'application/json'];
});

it('creates a pending request instead of joining in approval mode', function () {
    Event::fake([MembershipChanged::class]);

    $this->postJson(route('groups.join', [$this->session, $this->group]), [], $this->requesterHeaders)->assertOk();

    $membership = Membership::query()->where('participant_id', $this->requester->id)->sole();

    expect($membership->status)->toBe('pending');

    Event::assertDispatched(MembershipChanged::class);
});

it('lists pending requests on the group in the snapshot', function () {
    $this->postJson(route('groups.join', [$this->session, $this->group]), [], $this->requesterHeaders)->assertOk();

    $this->get(route('session.show', $this->session))
        ->assertInertia(fn ($page) => $page
            ->where('session.groups.0.pending.0.name', 'Leo'));
});

it('lets the leader approve a pending request', function () {
    $this->postJson(route('groups.join', [$this->session, $this->group]), [], $this->requesterHeaders)->assertOk();

    $this->postJson(route('groups.approve', [$this->session, $this->group, $this->requester]), [], [
        'X-Device-Token' => $this->leader->token,
        'Accept' => 'application/json',
    ])->assertOk();

    $membership = Membership::query()->where('participant_id', $this->requester->id)->sole();

    expect($membership->status)->toBe('active')
        ->and($membership->role)->toBe('member');
});

it('lets the leader reject a pending request', function () {
    $this->postJson(route('groups.join', [$this->session, $this->group]), [], $this->requesterHeaders)->assertOk();

    $this->postJson(route('groups.reject', [$this->session, $this->group, $this->requester]), [], [
        'X-Device-Token' => $this->leader->token,
        'Accept' => 'application/json',
    ])->assertOk();

    expect(Membership::query()->where('participant_id', $this->requester->id)->count())->toBe(0);
});

it('blocks non-leaders from approving', function () {
    $other = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $this->postJson(route('groups.join', [$this->session, $this->group]), [], $this->requesterHeaders)->assertOk();

    $this->postJson(route('groups.approve', [$this->session, $this->group, $this->requester]), [], [
        'X-Device-Token' => $other->token,
        'Accept' => 'application/json',
    ])->assertNotFound();

    expect(Membership::query()->where('participant_id', $this->requester->id)->first()->status)->toBe('pending');
});

it('honours a session override denying leader approval', function () {
    $config = $this->session->config->toArray();
    $config['perms']['approve_join']['leader'] = false;
    $this->session->update(['config' => $config]);

    $this->postJson(route('groups.join', [$this->session, $this->group]), [], $this->requesterHeaders)->assertOk();

    $this->postJson(route('groups.approve', [$this->session, $this->group, $this->requester]), [], [
        'X-Device-Token' => $this->leader->token,
        'Accept' => 'application/json',
    ])->assertStatus(422);
});

it('does not count pending requests toward capacity', function () {
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'rules' => ['join_mode' => 'approval', 'max_members' => 1],
    ])]);

    $this->postJson(route('groups.join', [$this->session, $this->group]), [], $this->requesterHeaders)->assertOk();

    expect($this->group->openSlots($this->session))->toBe(0); // leader occupies the one slot
});

it('lets the admin approve or reject any pending request', function () {
    $this->postJson(route('groups.join', [$this->session, $this->group]), [], $this->requesterHeaders)->assertOk();

    $admin = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];

    $this->postJson(route('groups.approve', [$this->session, $this->group, $this->requester]), [], $admin)->assertOk();

    expect(Membership::query()->where('participant_id', $this->requester->id)->first()->status)->toBe('active');

    $second = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Zoe']);
    $this->postJson(route('groups.join', [$this->session, $this->group]), [], ['X-Device-Token' => $second->token, 'Accept' => 'application/json'])->assertOk();
    $this->postJson(route('groups.reject', [$this->session, $this->group, $second]), [], $admin)->assertOk();

    expect(Membership::query()->where('participant_id', $second->id)->count())->toBe(0);
});

it('exposes every pending request to the admin board', function () {
    $this->postJson(route('groups.join', [$this->session, $this->group]), [], $this->requesterHeaders)->assertOk();

    $this->getJson(route('board.show', $this->session), ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('groups.0.pending.0.name', 'Leo');
});
