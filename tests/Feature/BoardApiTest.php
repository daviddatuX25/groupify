<?php

use App\Models\Group;
use App\Models\Participant;
use App\Models\Session;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('serves the board snapshot as JSON with identity', function () {
    $session = Session::factory()->create();
    $me = Participant::factory()->create(['group_session_id' => $session->id, 'name' => 'Maya']);
    $group = Group::factory()->create(['group_session_id' => $session->id, 'name' => 'Team Alpha']);
    $group->memberships()->create(['participant_id' => $me->id, 'role' => 'leader']);

    $this->getJson(route('board.show', $session), ['X-Device-Token' => $me->token])
        ->assertOk()
        ->assertJson([
            'code' => $session->code,
            'presence' => 1,
            'me' => ['name' => 'Maya', 'pooled' => false],
            'groups' => [
                ['name' => 'Team Alpha', 'member_count' => 1],
            ],
        ]);
});

it('serves the board snapshot to guests without identity', function () {
    $session = Session::factory()->create();

    $this->getJson(route('board.show', $session))
        ->assertOk()
        ->assertJson(['me' => null]);
});
