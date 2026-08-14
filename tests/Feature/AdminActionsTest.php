<?php

use App\Events\MembershipChanged;
use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->headers = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
});

it('serves the board to the admin with is_admin and stats', function () {
    Participant::factory()->count(3)->create(['group_session_id' => $this->session->id]);
    Group::factory()->create(['group_session_id' => $this->session->id]);

    $this->getJson(route('board.show', $this->session), $this->headers)
        ->assertOk()
        ->assertJson([
            'is_admin' => true,
            'presence' => 3,
            'code' => $this->session->code,
        ])
        ->assertJsonCount(1, 'groups');
});

it('moves a member to another group and broadcasts', function () {
    Event::fake([MembershipChanged::class]);
    $alpha = Group::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Team Alpha']);
    $bravo = Group::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Team Bravo']);
    $maya = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $alpha->memberships()->create(['participant_id' => $maya->id, 'role' => 'member']);

    $this->postJson(route('admin.members.move', [$this->session, $maya]), ['to_group_id' => $bravo->id], $this->headers)
        ->assertOk();

    expect(Membership::query()->where('group_id', $alpha->id)->count())->toBe(0)
        ->and(Membership::query()->where('group_id', $bravo->id)->where('participant_id', $maya->id)->count())->toBe(1);

    Event::assertDispatched(MembershipChanged::class);
});

it('moves a member to the pool (kick)', function () {
    $alpha = Group::factory()->create(['group_session_id' => $this->session->id]);
    $maya = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $alpha->memberships()->create(['participant_id' => $maya->id, 'role' => 'member']);

    $this->postJson(route('admin.members.move', [$this->session, $maya]), ['to_group_id' => null], $this->headers)
        ->assertOk();

    expect(Membership::query()->count())->toBe(0);
});

it('transfers leadership when the admin moves a leader', function () {
    $alpha = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => null]);
    $maya = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $leo = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $alpha->memberships()->create(['participant_id' => $maya->id, 'role' => 'leader']);
    $alpha->memberships()->create(['participant_id' => $leo->id, 'role' => 'member']);

    $this->postJson(route('admin.members.move', [$this->session, $maya]), ['to_group_id' => null], $this->headers)
        ->assertOk();

    $alpha->refresh();
    expect($alpha->leader_id)->toBe($leo->id)
        ->and($alpha->memberships()->where('participant_id', $leo->id)->first()->role)->toBe('leader');
});

it('rejects admin actions without a valid token', function () {
    $maya = Participant::factory()->create(['group_session_id' => $this->session->id]);

    $this->postJson(route('admin.members.move', [$this->session, $maya]), ['to_group_id' => null])
        ->assertNotFound();
});

it('dissolves all groups back to the pool', function () {
    $alpha = Group::factory()->create(['group_session_id' => $this->session->id]);
    $bravo = Group::factory()->create(['group_session_id' => $this->session->id]);
    $a = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $b = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $alpha->memberships()->create(['participant_id' => $a->id, 'role' => 'leader']);
    $bravo->memberships()->create(['participant_id' => $b->id, 'role' => 'member']);

    $this->postJson(route('admin.dissolve', $this->session), [], $this->headers)->assertOk();

    expect(Membership::query()->count())->toBe(0);
});

it('dissolves a single group only', function () {
    $alpha = Group::factory()->create(['group_session_id' => $this->session->id]);
    $bravo = Group::factory()->create(['group_session_id' => $this->session->id]);
    $a = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $b = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $alpha->memberships()->create(['participant_id' => $a->id, 'role' => 'leader']);
    $bravo->memberships()->create(['participant_id' => $b->id, 'role' => 'member']);

    $this->postJson(route('admin.dissolve', $this->session), ['group_id' => $alpha->id], $this->headers)->assertOk();

    expect(Membership::query()->count())->toBe(1)
        ->and(Membership::query()->where('group_id', $bravo->id)->count())->toBe(1);
});
