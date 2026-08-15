<?php

use App\Events\MembershipChanged;
use App\Models\Participant;
use App\Models\Session;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
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
    ])->assertRedirect(route('session.show', ['session' => $this->session, 'device_token' => $this->token]));

    $participant = Participant::query()->sole();

    expect($participant->group_session_id)->toBe($this->session->id)
        ->and($participant->token)->toBe($this->token)
        ->and($participant->name)->toBe('Maya')
        ->and($participant->email)->toBe('maya@example.com');
});

it('broadcasts a participant join so admin monitors update in real time', function () {
    Event::fake([MembershipChanged::class]);

    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821',
        'name' => 'Maya',
        'device_token' => $this->token,
    ])->assertRedirect();

    Event::assertDispatched(
        MembershipChanged::class,
        fn (MembershipChanged $event): bool => $event->groupId === 0 && $event->action === 'participant_joined',
    );
});

it('joins with email optional', function () {
    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821',
        'name' => 'Leo',
        'device_token' => $this->token,
    ])->assertRedirect(route('session.show', ['session' => $this->session, 'device_token' => $this->token]));

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

it('locks the session after 10 wrong PIN attempts', function () {
    for ($i = 0; $i < 9; $i++) {
        $this->postJson(route('join.store', $this->session), [
            'pin' => '0000', 'name' => 'X'.$i, 'device_token' => (string) Str::uuid(),
        ])->assertStatus(422)->assertJsonValidationErrors('pin');
    }

    // The 10th wrong attempt trips the lockout for further WRONG guesses.
    $this->postJson(route('join.store', $this->session), [
        'pin' => '0000', 'name' => 'X9', 'device_token' => (string) Str::uuid(),
    ])->assertStatus(429);

    // Knowing the PIN still joins (and clears the counter) — the limiter
    // only throttles wrong guesses, never punishes the correct one.
    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821', 'name' => 'Maya', 'device_token' => $this->token,
    ])->assertRedirect();
});

it('keeps wrong-PIN lockout scoped to the offending session', function () {
    for ($i = 0; $i < 10; $i++) {
        $this->postJson(route('join.store', $this->session), [
            'pin' => '0000', 'name' => 'X'.$i, 'device_token' => (string) Str::uuid(),
        ])->assertStatus($i < 9 ? 422 : 429);
    }

    $other = Session::factory()->create(['pin' => '1111']);

    $this->postJson(route('join.store', $other), [
        'pin' => '1111', 'name' => 'Ana', 'device_token' => (string) Str::uuid(),
    ])->assertRedirect();
});

it('clears the failed-PIN count on a successful join', function () {
    for ($i = 0; $i < 5; $i++) {
        $this->postJson(route('join.store', $this->session), [
            'pin' => '0000', 'name' => 'X'.$i, 'device_token' => (string) Str::uuid(),
        ])->assertStatus(422);
    }

    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821', 'name' => 'Maya', 'device_token' => $this->token,
    ])->assertRedirect();

    // Count was cleared — the lockout threshold applies to a fresh window.
    for ($i = 0; $i < 9; $i++) {
        $this->postJson(route('join.store', $this->session), [
            'pin' => '0000', 'name' => 'Y'.$i, 'device_token' => (string) Str::uuid(),
        ])->assertStatus(422);
    }
    $this->postJson(route('join.store', $this->session), [
        'pin' => '4821', 'name' => 'Maya', 'device_token' => $this->token,
    ])->assertRedirect();
});
