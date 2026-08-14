<?php

use App\Models\Participant;
use App\Models\Session;
use App\Support\SessionConfig;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'rules' => ['guest_list' => ['Maya', 'Leo', 'Ana']],
    ])]);
});

function joinAttempt(Session $session, string $name): TestResponse
{
    return test()->postJson(route('join.store', $session), [
        'pin' => $session->pin,
        'name' => $name,
        'device_token' => (string) Str::uuid(),
    ]);
}

it('admits an allowed name from the guest list', function () {
    joinAttempt($this->session, 'Maya')->assertRedirect();

    expect(Participant::query()->where('name', 'Maya')->exists())->toBeTrue();
});

it('matches guest names case-insensitively and trimmed', function () {
    joinAttempt($this->session, '  maya ')->assertRedirect();

    expect(Participant::query()->where('name', 'maya')->exists())->toBeTrue();
});

it('rejects a name not on the list', function () {
    joinAttempt($this->session, 'Intruder')
        ->assertStatus(422)
        ->assertJsonValidationErrors('name');

    expect(Participant::query()->count())->toBe(0);
});

it('allows each guest name to be claimed once', function () {
    joinAttempt($this->session, 'Leo')->assertRedirect();

    joinAttempt($this->session, 'Leo')->assertStatus(422)->assertJsonValidationErrors('name');

    expect(Participant::query()->where('name', 'Leo')->count())->toBe(1);
});

it('leaves the session open when no guest list is set', function () {
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'rules' => ['guest_list' => []],
    ])]);

    joinAttempt($this->session, 'Anyone')->assertRedirect();
});

it('validates the guest list shape on config update', function () {
    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['rules' => ['guest_list' => ['ok', 42]]],
        ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json']
    )->assertStatus(422)->assertJsonValidationErrors('rules.guest_list.1');
});
