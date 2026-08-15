<?php

use App\Models\Group;
use App\Models\Participant;
use App\Models\Session;
use App\Plugins\PluginRegistry;
use App\Support\SessionConfig;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->me = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $this->headers = ['X-Device-Token' => $this->me->token, 'Accept' => 'application/json'];
    $this->adminHeaders = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
});

it('lets a leader set their group size within session bounds (default delegation)', function () {
    $this->postJson(route('groups.store', $this->session), ['capacity' => 4], $this->headers)->assertOk();

    $group = Group::query()->sole();
    expect($group->capacity)->toBe(4)
        ->and($group->openSlots($this->session))->toBe(3); // leader occupies one seat
});

it('rejects capacity outside session bounds', function () {
    $this->postJson(route('groups.store', $this->session), ['capacity' => 2], $this->headers)
        ->assertStatus(422)->assertJsonValidationErrors('capacity');

    $this->postJson(route('groups.store', $this->session), ['capacity' => 9], $this->headers)
        ->assertStatus(422)->assertJsonValidationErrors('capacity');
});

it('respects a session override denying leaders group size control', function () {
    $config = array_replace_recursive(SessionConfig::defaults(), [
        'perms' => ['set_group_size' => ['leader' => false]],
    ]);
    $this->session->update(['config' => $config]);

    $this->postJson(route('groups.store', $this->session), ['capacity' => 4], $this->headers)
        ->assertStatus(422)->assertJsonValidationErrors('capacity');
});

it('uses the group capacity in the snapshot and join checks', function () {
    $group = Group::factory()->create(['group_session_id' => $this->session->id, 'capacity' => 1]);
    $leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $group->memberships()->create(['participant_id' => $leader->id, 'role' => 'leader']);

    $this->get(route('session.show', $this->session))
        ->assertInertia(fn ($page) => $page->where('session.groups.0.capacity', 1));

    $this->postJson(route('groups.join', [$this->session, $group]), [], $this->headers)->assertStatus(422);
});

it('enforces fill_group_fields delegation', function () {
    $config = array_replace_recursive(SessionConfig::defaults(), [
        'fields' => [['name' => 'Chosen topic', 'type' => 'text', 'required' => false]],
        'perms' => ['fill_group_fields' => ['leader' => false]],
    ]);
    $this->session->update(['config' => $config]);

    $this->postJson(route('groups.store', $this->session), ['field_values' => ['Chosen topic' => 'AI']], $this->headers)
        ->assertStatus(422)->assertJsonValidationErrors('field_values');
});

it('accepts an empty plugin list and enables a first-party plugin', function () {
    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['plugins' => []],
        ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json']
    )->assertOk();

    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['plugins' => ['quiz']],
        ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json']
    )->assertOk();

    expect($this->session->fresh()->config->hasPlugin('quiz'))->toBeTrue();
});

it('exposes the first-party plugin registry with origins', function () {
    expect(app(PluginRegistry::class)->registered())->toBe([
        'quiz' => PluginRegistry::ORIGIN_FIRST_PARTY,
        'match_me' => PluginRegistry::ORIGIN_FIRST_PARTY,
        'proxy' => PluginRegistry::ORIGIN_FIRST_PARTY,
        'announcements' => PluginRegistry::ORIGIN_FIRST_PARTY,
        'moderation' => PluginRegistry::ORIGIN_FIRST_PARTY,
    ]);
});

it('rejects enabling an unregistered extension key', function () {
    $this->putJson(route('admin.sessions.config.update', $this->session), [
        'plugins' => ['definitely-not-a-module'],
    ], $this->adminHeaders)->assertStatus(422);
});
