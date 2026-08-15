<?php

use App\Models\Participant;
use App\Models\Session;
use Carbon\Carbon;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);
});

it('creates a session with pinless QR and configured lifecycle choices', function () {
    $endsAt = now()->addHours(4)->format('Y-m-d H:i:s');

    $this->post(route('sessions.store'), [
        'join_mode' => 'approval',
        'qr_pinless' => false,
        'retention_days' => 180,
        'ends_at' => $endsAt,
    ])->assertRedirect();

    $session = Session::query()->sole();

    expect($session->qr_token)->toHaveLength(64)
        ->and($session->config->rules())->toMatchArray([
            'join_mode' => 'approval',
            'qr_pinless' => false,
            'retention_days' => 180,
        ])
        ->and($session->ends_at?->format('Y-m-d H:i:s'))->toBe($endsAt);
});

it('allows an open session URL to join without a PIN', function () {
    $session = Session::factory()->create();
    $token = (string) Str::uuid();

    $this->get(route('join.show', $session))
        ->assertInertia(fn ($page) => $page
            ->where('session.pin_required', false));

    $this->postJson(route('join.store', $session), [
        'name' => 'Direct Guest',
        'device_token' => $token,
    ])->assertRedirect();

    expect(Participant::query()->where('token', $token)->exists())->toBeTrue();
});

it('keeps the PIN requirement for direct approval session URLs', function () {
    $session = Session::factory()->create([
        'config' => array_replace_recursive(Session::factory()->raw()['config'], [
            'rules' => ['join_mode' => 'approval'],
        ]),
    ]);

    $this->get(route('join.show', $session))
        ->assertInertia(fn ($page) => $page
            ->where('session.pin_required', true));

    $this->postJson(route('join.store', $session), [
        'name' => 'Direct Guest',
        'device_token' => (string) Str::uuid(),
    ])->assertStatus(422)->assertJsonValidationErrors('pin');
});

it('allows a valid pinless QR grant to join without the PIN', function () {
    $session = Session::factory()->create([
        'config' => array_replace_recursive(Session::factory()->raw()['config'], [
            'rules' => ['join_mode' => 'approval', 'qr_pinless' => true],
        ]),
    ]);
    $token = (string) Str::uuid();

    $this->get(route('join.show', ['session' => $session, 'qr_token' => $session->qr_token]))
        ->assertInertia(fn ($page) => $page
            ->where('session.pin_required', false));

    $this->postJson(route('join.store', $session), [
        'name' => 'QR Guest',
        'device_token' => $token,
        'qr_token' => $session->qr_token,
    ])->assertRedirect();

    expect(Participant::query()->where('token', $token)->exists())->toBeTrue();
});

it('rejects a missing or invalid PIN when QR PIN bypass is disabled', function () {
    $session = Session::factory()->create([
        'config' => array_replace_recursive(Session::factory()->raw()['config'], [
            'rules' => ['join_mode' => 'approval', 'qr_pinless' => false],
        ]),
    ]);

    $this->postJson(route('join.store', $session), [
        'name' => 'QR Guest',
        'device_token' => (string) Str::uuid(),
        'qr_token' => $session->qr_token,
    ])->assertStatus(422)->assertJsonValidationErrors('pin');
});

it('archives an expired session and computes its purge deadline', function () {
    $session = Session::factory()->create([
        'ends_at' => now()->subMinute(),
        'config' => array_replace_recursive(Session::factory()->raw()['config'], [
            'rules' => ['retention_days' => 2],
        ]),
    ]);

    $this->artisan('sessions:archive-expired')->assertSuccessful();
    $session->refresh();

    expect($session->status)->toBe('archived')
        ->and($session->archived_at)->not->toBeNull()
        ->and($session->purge_at?->between(now()->addDays(1)->subMinute(), now()->addDays(2)->addMinute()))->toBeTrue();
});

it('purges an archived session at its configured deadline', function () {
    $session = Session::factory()->create([
        'status' => 'archived',
        'archived_at' => Carbon::now()->subDays(3),
        'purge_at' => Carbon::now()->subDay(),
    ]);
    Participant::factory()->create(['group_session_id' => $session->id]);

    $this->artisan('sessions:purge')->assertSuccessful();

    expect(Session::query()->find($session->id))->toBeNull()
        ->and(Participant::query()->where('group_session_id', $session->id)->exists())->toBeFalse();
});
