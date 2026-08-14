<?php

use App\Models\Group;
use App\Models\Participant;
use App\Models\Session;
use App\Support\SessionConfig;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
});

it('assigns a random display name in anonymous mode', function () {
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'rules' => ['anonymous_mode' => true],
    ])]);

    $this->postJson(route('join.store', $this->session), [
        'pin' => $this->session->pin,
        'name' => 'Maya',
        'device_token' => (string) Str::uuid(),
    ])->assertRedirect();

    $participant = Participant::query()->sole();

    expect($participant->name)->toBe('Maya')
        ->and($participant->display_name)->not->toBeNull()
        ->and($participant->display_name)->not->toBe('Maya');
});

it('shows the display name on the board but the real name to the admin', function () {
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'rules' => ['anonymous_mode' => true],
    ])]);
    $me = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Maya', 'display_name' => 'Swift Fox']);
    $group = Group::factory()->create(['group_session_id' => $this->session->id]);
    $group->memberships()->create(['participant_id' => $me->id, 'role' => 'leader']);

    $this->get(route('session.show', $this->session), ['X-Device-Token' => $me->token])
        ->assertInertia(fn ($page) => $page
            ->where('session.groups.0.members.0.name', 'Swift Fox')
            ->where('session.groups.0.members.0.real_name', null)
            ->where('session.me.name', 'Swift Fox'));

    $this->getJson(route('board.show', $this->session), ['X-Admin-Token' => $this->session->admin_token])
        ->assertOk()
        ->assertJsonPath('groups.0.members.0.real_name', 'Maya');
});

it('keeps normal names when anonymous mode is off', function () {
    $me = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Maya']);

    $this->get(route('session.show', $this->session), ['X-Device-Token' => $me->token])
        ->assertInertia(fn ($page) => $page->where('session.me.name', 'Maya'));
});

it('exports the registered name column in anonymous mode', function () {
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'rules' => ['anonymous_mode' => true],
    ])]);
    Participant::factory()->create([
        'group_session_id' => $this->session->id,
        'name' => 'Maya',
        'display_name' => 'Swift Fox',
        'email' => 'maya@example.com',
    ]);

    $response = $this->get(route('admin.export', $this->session), [
        'X-Admin-Token' => $this->session->admin_token,
        'Accept' => 'text/csv',
    ])->assertOk();

    expect($response->streamedContent())
        ->toContain('name,"registered name"')
        ->toContain('"Swift Fox",Maya');
});

it('validates anonymous_mode as a boolean', function () {
    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['rules' => ['anonymous_mode' => 'yes']],
        ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json']
    )->assertStatus(422)->assertJsonValidationErrors('rules.anonymous_mode');
});
