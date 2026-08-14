<?php

use App\Models\Participant;
use App\Models\Session;
use App\Services\PermissionService;
use App\Support\SessionConfig;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'rules' => ['chat_enabled' => true],
        'roles' => ['co-host' => ['announce']],
    ])]);

    $this->cohost = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Aria']);
    $this->adminHeaders = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
});

it('resolves a custom role from the session config', function () {
    $perms = app(PermissionService::class);

    expect($perms->can('announce', 'co-host', $this->session->config))->toBeTrue()
        ->and($perms->can('export_csv', 'co-host', $this->session->config))->toBeFalse();
});

it('assigns a custom role to a participant who may then announce', function () {
    $this->postJson(route('admin.members.role', [$this->session, $this->cohost]), ['role' => 'co-host'], $this->adminHeaders)
        ->assertOk();

    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'announcement',
        'body' => 'From the co-host',
    ], ['X-Device-Token' => $this->cohost->token, 'Accept' => 'application/json'])->assertOk();
});

it('rejects assigning an undefined role', function () {
    $this->postJson(route('admin.members.role', [$this->session, $this->cohost]), ['role' => 'wizard'], $this->adminHeaders)
        ->assertStatus(422)->assertJsonValidationErrors('role');
});

it('clears the custom role to revoke the powers', function () {
    $this->postJson(route('admin.members.role', [$this->session, $this->cohost]), ['role' => 'co-host'], $this->adminHeaders)->assertOk();
    $this->postJson(route('admin.members.role', [$this->session, $this->cohost]), ['role' => null], $this->adminHeaders)->assertOk();

    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'announcement',
        'body' => 'Nope',
    ], ['X-Device-Token' => $this->cohost->token, 'Accept' => 'application/json'])->assertNotFound();
});

it('keeps the base role for actions outside the custom set (additive grants)', function () {
    $this->postJson(route('admin.members.role', [$this->session, $this->cohost]), ['role' => 'co-host'], $this->adminHeaders)->assertOk();

    // create_group is a member action — the custom role grants announce, not restrictions
    $this->postJson(route('groups.store', $this->session), [], [
        'X-Device-Token' => $this->cohost->token,
        'Accept' => 'application/json',
    ])->assertOk();

    // but the custom role alone does not grant admin-only powers
    expect(app(PermissionService::class)->can('export_csv', 'co-host', $this->session->config))->toBeFalse();
});

it('exposes assigned roles in the snapshot', function () {
    $this->postJson(route('admin.members.role', [$this->session, $this->cohost]), ['role' => 'co-host'], $this->adminHeaders)->assertOk();

    $this->getJson(route('board.show', $this->session), $this->adminHeaders)
        ->assertOk()
        ->assertJsonPath('pool.0.custom_role', 'co-host');
});
