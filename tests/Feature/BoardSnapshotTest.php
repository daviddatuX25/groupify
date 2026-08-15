<?php

use App\Models\Group;
use App\Models\Participant;
use App\Models\Session;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
});

it('lists pooled participants and group cards in the session snapshot', function () {
    $pooled = Participant::factory()->count(2)->sequence(
        ['name' => 'Amy', 'avatar_style' => 'lorelei', 'avatar_seed' => 'amy-seed'],
        ['name' => 'Bea', 'avatar_style' => 'adventurer', 'avatar_seed' => 'bea-seed'],
    )->create(['group_session_id' => $this->session->id]);
    $member = Participant::factory()->create([
        'group_session_id' => $this->session->id,
        'name' => 'Carl',
        'avatar_style' => 'bottts-neutral',
        'avatar_seed' => 'carl-seed',
    ]);
    $group = Group::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Team Alpha']);
    $group->memberships()->create(['participant_id' => $member->id, 'role' => 'leader']);

    $this->get(route('session.show', $this->session))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Session/Show')
            ->has('session.pool', 2)
            ->where('session.pool.0.avatar.style', 'lorelei')
            ->where('session.pool.0.avatar.seed', 'amy-seed')
            ->has('session.groups', 1)
            ->where('session.groups.0.name', 'Team Alpha')
            ->where('session.groups.0.member_count', 1)
            ->where('session.groups.0.capacity', 6)
            ->where('session.groups.0.members.0.avatar.style', 'bottts-neutral')
            ->where('session.presence', 3));
});

it('resolves the viewing participant by device token header', function () {
    $participant = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Maya']);

    $this->get(route('session.show', $this->session), ['X-Device-Token' => $participant->token])
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('session.me.name', 'Maya')
            ->where('session.me.pooled', true));
});

it('reports member_count zero and open slots for an empty group', function () {
    Group::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Team Bravo']);

    $this->get(route('session.show', $this->session))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('session.groups.0.member_count', 0)
            ->where('session.groups.0.open_slots', 6));
});

it('includes field values on group cards', function () {
    $group = Group::factory()->create([
        'group_session_id' => $this->session->id,
        'name' => 'Team Alpha',
        'field_values' => ['topic' => 'AI Healthcare App'],
    ]);

    $this->get(route('session.show', $this->session))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('session.groups.0.field_values.topic', 'AI Healthcare App'));
});
