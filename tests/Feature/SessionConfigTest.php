<?php

use App\Events\SessionConfigUpdated;
use App\Models\Session;
use App\Services\PermissionService;
use App\Support\SessionConfig;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Admin routes are token-authed (X-Admin-Token, AD-3); the React client sends
    // the XSRF cookie automatically, so CSRF stays on in production. Tests bypass it.
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
});

function adminHeaders(Session $session): array
{
    return ['X-Admin-Token' => $session->admin_token, 'Accept' => 'application/json'];
}

it('applies default config on create', function () {
    $config = $this->session->config;

    expect($config)->toBeInstanceOf(SessionConfig::class)
        ->and($config->rules())->toMatchArray([
            'min_members' => 3,
            'max_members' => 6,
            'join_mode' => 'open',
            'allow_user_creation' => true,
            'naming' => 'alpha',
            'freeze' => false,
        ])
        ->and($config->plugins())->toBe(['announcements']);
});

it('stores config as one validated JSON structure on the session row', function () {
    $raw = $this->session->getRawOriginal('config');

    expect(is_string($raw))->toBeTrue()
        ->and(json_decode($raw, true))->toHaveKeys(['rules', 'fields', 'perms', 'plugins']);
});

it('resolves permissions against system defaults', function () {
    $svc = app(PermissionService::class);
    $config = $this->session->config;

    expect($svc->can('move_members', 'admin', $config))->toBeTrue()
        ->and($svc->can('move_members', 'member', $config))->toBeFalse()
        ->and($svc->can('create_group', 'member', $config))->toBeTrue()
        ->and($svc->can('export_csv', 'leader', $config))->toBeFalse()
        ->and($svc->can('kick_ban', 'leader', $config))->toBeTrue();
});

it('session override wins over role and system defaults', function () {
    $session = $this->session;
    $session->update(['config' => $session->config->withPerms([
        'create_group' => ['member' => false],
        'export_csv' => ['admin' => false],
    ])]);

    $svc = app(PermissionService::class);
    $config = $session->fresh()->config;

    expect($svc->can('create_group', 'member', $config))->toBeFalse()
        ->and($svc->can('export_csv', 'admin', $config))->toBeFalse()
        // untouched actions still fall through to defaults
        ->and($svc->can('move_members', 'admin', $config))->toBeTrue();
});

it('rejects invalid config on update', function () {
    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['rules' => ['min_members' => 10, 'max_members' => 5]],
        adminHeaders($this->session)
    )->assertStatus(422)->assertJsonValidationErrors('rules.max_members');
});

it('rejects updates without a valid admin token', function () {
    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['rules' => ['min_members' => 2]],
        ['Accept' => 'application/json']
    )->assertNotFound();
});

it('updates config and broadcasts the change', function () {
    Event::fake([SessionConfigUpdated::class]);

    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['rules' => ['min_members' => 2, 'max_members' => 8]],
        adminHeaders($this->session)
    )->assertOk();

    $this->session->refresh();
    expect($this->session->config->rules())->toMatchArray([
        'min_members' => 2,
        'max_members' => 8,
    ]);

    Event::assertDispatched(SessionConfigUpdated::class);
});

it('applies rule changes live through the resolver', function () {
    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['rules' => ['join_mode' => 'approval']],
        adminHeaders($this->session)
    )->assertOk();

    $this->session->refresh();

    expect($this->session->config->rules()['join_mode'])->toBe('approval');
});

it('preserves unknown future settings through a roundtrip (schema evolution)', function () {
    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['rules' => ['future_setting' => 'x']],
        adminHeaders($this->session)
    )->assertOk();

    $this->session->refresh();

    expect($this->session->config->rules())->toHaveKey('future_setting');
});

it('validates fields shape', function () {
    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['fields' => [['name' => 'Chosen topic', 'type' => 'bogus-type']]],
        adminHeaders($this->session)
    )->assertStatus(422)->assertJsonValidationErrors('fields.0.type');
});
