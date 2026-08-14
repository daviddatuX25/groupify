<?php

use App\Models\Group;
use App\Models\Participant;
use App\Models\Session;
use App\Models\SessionEvent;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->headers = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
});

it('records join and group events', function () {
    $me = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Maya']);
    $group = Group::factory()->create(['group_session_id' => $this->session->id]);

    $this->postJson(route('groups.join', [$this->session, $group]), [], ['X-Device-Token' => $me->token, 'Accept' => 'application/json'])->assertOk();

    expect(SessionEvent::query()->pluck('type')->toArray())
        ->toContain('member_joined');
});

it('lists activity newest-first for the admin', function () {
    SessionEvent::query()->create(['group_session_id' => $this->session->id, 'type' => 'member_joined', 'payload' => ['name' => 'Maya'], 'created_at' => now()->subMinutes(2)]);
    SessionEvent::query()->create(['group_session_id' => $this->session->id, 'type' => 'group_created', 'payload' => ['name' => 'Team Alpha'], 'created_at' => now()->subMinute()]);

    $this->getJson(route('admin.activity', $this->session), $this->headers)
        ->assertOk()
        ->assertJsonCount(2, 'events')
        ->assertJsonPath('events.0.type', 'group_created');
});

it('rejects activity without an admin token', function () {
    $this->getJson(route('admin.activity', $this->session))->assertNotFound();
});
