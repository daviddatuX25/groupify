<?php

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
    $this->session->update(['config' => SessionConfig::deepMerge($this->session->config->toArray(), ['extensions' => ['proxy']])]);
    $this->adminHeaders = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
});

it('bulk-creates proxied seats from a name list', function () {
    $this->postJson(route('admin.participants.store', $this->session), [
        'names' => ['Ana', 'Ben', 'Cai'],
    ], $this->adminHeaders)->assertOk();

    $seats = Participant::query()->where('group_session_id', $this->session->id)->get();

    expect($seats)->toHaveCount(3)
        ->and($seats->every(fn ($p) => $p->token === null))->toBeTrue()
        ->and($seats->pluck('name')->all())->toEqualCanonicalizing(['Ana', 'Ben', 'Cai']);
});

it('skips names that already have a seat', function () {
    Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Ana']);

    $this->postJson(route('admin.participants.store', $this->session), [
        'names' => ['Ana', 'Ben'],
    ], $this->adminHeaders)->assertOk();

    expect(Participant::query()->where('group_session_id', $this->session->id)->count())->toBe(2);
});

it('claims a proxied seat when the real person joins with that name', function () {
    Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Ana', 'token' => null]);

    $token = (string) Str::uuid();
    $this->postJson(route('join.store', $this->session), [
        'pin' => $this->session->pin,
        'name' => 'Ana',
        'device_token' => $token,
    ])->assertRedirect();

    $seat = Participant::query()->where('group_session_id', $this->session->id)->where('name', 'Ana')->sole();

    expect($seat->token)->toBe($token);
});

it('rejects a second device claiming the same proxied seat', function () {
    Participant::factory()->create([
        'group_session_id' => $this->session->id,
        'name' => 'Ana',
        'token' => (string) Str::uuid(),
    ]);

    $this->postJson(route('join.store', $this->session), [
        'pin' => $this->session->pin,
        'name' => 'Ana',
        'device_token' => (string) Str::uuid(),
    ])->assertStatus(422)->assertJsonValidationErrors('name');
});

it('requires an admin token to bulk-create seats', function () {
    $this->postJson(route('admin.participants.store', $this->session), ['names' => ['Ana']])
        ->assertNotFound();
});

it('lists proxied seats in the pool', function () {
    Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Ana', 'token' => null]);
    Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Ben']);

    $this->getJson(route('board.show', $this->session), $this->adminHeaders)
        ->assertOk()
        ->assertJsonCount(2, 'pool');
});
