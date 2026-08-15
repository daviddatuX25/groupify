<?php

use App\Models\Session;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);
});

it('serves the create-session page at /new', function () {
    $this->get(route('sessions.new'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Admin/New'));
});

it('creates a session with unique code, pin, and admin token', function () {
    $this->post(route('sessions.store'))->assertRedirect();

    $session = Session::query()->sole();

    expect($session->code)->toMatch('/^\d{6}$/')
        ->and($session->pin)->toMatch('/^\d{4}$/')
        ->and($session->admin_token)->not->toBeEmpty()
        ->and($session->status)->toBe('live');
});

it('creates distinct codes for consecutive sessions', function () {
    $this->post(route('sessions.store'))->assertRedirect();
    $this->post(route('sessions.store'))->assertRedirect();

    $codes = Session::query()->pluck('code');

    expect($codes)->toHaveCount(2)
        ->and($codes->unique())->toHaveCount(2);
});

it('seeds default config on create', function () {
    $this->post(route('sessions.store'))->assertRedirect();

    $rules = Session::query()->sole()->config->rules();

    expect($rules)->toMatchArray([
        'min_members' => 3,
        'max_members' => 6,
        'join_mode' => 'open',
        'allow_user_creation' => true,
        'naming' => 'alpha',
        'freeze' => false,
    ]);
});

it('redirects the creator into the admin panel with the token', function () {
    $this->post(route('sessions.store'))
        ->assertRedirect(route('admin.sessions.show', [
            'session' => Session::query()->sole(),
            'token' => Session::query()->sole()->admin_token,
        ]));
});

it('keeps the creator in the admin panel after the token URL is cleaned', function () {
    $this->post(route('sessions.store'))->assertRedirect();
    $session = Session::query()->sole();

    $this->get(route('admin.sessions.show', $session))->assertOk();
});

it('opens the admin panel with a valid token', function () {
    $session = Session::factory()->create();

    $this->get(route('admin.sessions.show', ['session' => $session, 'token' => $session->admin_token]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Show')
            ->where('session.code', $session->code)
            ->where('session.pin', $session->pin));
});

it('rejects the admin panel without a valid token', function () {
    $session = Session::factory()->create();

    $this->get(route('admin.sessions.show', $session))->assertNotFound();
    $this->get(route('admin.sessions.show', ['session' => $session, 'token' => 'wrong-token']))->assertNotFound();
});
