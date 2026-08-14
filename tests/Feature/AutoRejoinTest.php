<?php

use App\Models\Participant;
use App\Models\Session;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->token = (string) Str::uuid();
});

it('reports a seat for an existing device token', function () {
    Participant::factory()->create([
        'group_session_id' => $this->session->id,
        'token' => $this->token,
        'name' => 'Maya',
    ]);

    $this->getJson(route('join.seat', ['session' => $this->session]).'?token='.$this->token)
        ->assertOk()
        ->assertJson(['seat' => true, 'name' => 'Maya']);
});

it('reports no seat for an unknown token', function () {
    $this->getJson(route('join.seat', ['session' => $this->session]).'?token='.$this->token)
        ->assertOk()
        ->assertJson(['seat' => false, 'name' => null]);
});

it('reports no seat for a token from another session', function () {
    $other = Session::factory()->create();
    Participant::factory()->create(['group_session_id' => $other->id, 'token' => $this->token]);

    $this->getJson(route('join.seat', ['session' => $this->session]).'?token='.$this->token)
        ->assertOk()
        ->assertJson(['seat' => false]);
});

it('requires a valid device token', function () {
    $this->getJson(route('join.seat', $this->session))->assertStatus(422);
});
