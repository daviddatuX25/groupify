<?php

use App\Models\Participant;
use App\Models\Session;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create(['pin' => '4821']);
    $this->token = (string) Str::uuid();
});

it('serves the join page for an existing code', function () {
    $this->get(route('join.show', $this->session))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Session/Join')
            ->where('session.code', $this->session->code));
});

it('404s for an unknown code', function () {
    $this->get(route('join.show', '999999'))->assertNotFound();
});

it('joins with the correct PIN, name, and email', function () {
    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821',
        'name' => 'Maya',
        'email' => 'maya@example.com',
        'device_token' => $this->token,
    ])->assertRedirect(route('session.show', $this->session));

    $participant = Participant::query()->sole();

    expect($participant->group_session_id)->toBe($this->session->id)
        ->and($participant->token)->toBe($this->token)
        ->and($participant->name)->toBe('Maya')
        ->and($participant->email)->toBe('maya@example.com');
});

it('joins with email optional', function () {
    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821',
        'name' => 'Leo',
        'device_token' => $this->token,
    ])->assertRedirect(route('session.show', $this->session));

    expect(Participant::query()->sole()->email)->toBeNull();
});

it('rejects a wrong PIN with a clear error', function () {
    $this->postJson(route('join.store', $this->session), [
        'pin' => '0000',
        'name' => 'Maya',
        'device_token' => $this->token,
    ])->assertStatus(422)->assertJsonValidationErrors('pin');

    expect(Participant::query()->count())->toBe(0);
});

it('requires a name', function () {
    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821',
        'name' => '',
        'device_token' => $this->token,
    ])->assertStatus(422)->assertJsonValidationErrors('name');
});

it('validates email format when provided', function () {
    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821',
        'name' => 'Maya',
        'email' => 'not-an-email',
        'device_token' => $this->token,
    ])->assertStatus(422)->assertJsonValidationErrors('email');
});

it('reuses the seat for the same device token (no duplicate)', function () {
    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821',
        'name' => 'Maya',
        'device_token' => $this->token,
    ])->assertRedirect();

    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821',
        'name' => 'Maya',
        'device_token' => $this->token,
    ])->assertRedirect();

    expect(Participant::query()->count())->toBe(1);
});

it('does not lock out after failed PIN attempts', function () {
    foreach (['0000', '1111', '2222'] as $wrongPin) {
        $this->postJson(route('join.store', $this->session), [
            'pin' => $wrongPin,
            'name' => 'Maya',
            'device_token' => $this->token,
        ])->assertStatus(422);
    }

    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821',
        'name' => 'Maya',
        'device_token' => $this->token,
    ])->assertRedirect();
});
