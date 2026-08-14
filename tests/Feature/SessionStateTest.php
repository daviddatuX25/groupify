<?php

use App\Events\SessionDeleted;
use App\Events\SessionStateUpdated;
use App\Models\Participant;
use App\Models\Session;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create(['status' => 'live']);
    $this->headers = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
});

it('freezes a live session via config rules and broadcasts', function () {
    Event::fake([SessionStateUpdated::class]);

    $this->patchJson(route('admin.sessions.state.update', $this->session), ['action' => 'freeze'], $this->headers)
        ->assertOk();

    $this->session->refresh();

    expect($this->session->config->rules()['freeze'])->toBeTrue();

    Event::assertDispatched(SessionStateUpdated::class);
});

it('unfreezes a frozen session', function () {
    $this->patchJson(route('admin.sessions.state.update', $this->session), ['action' => 'freeze'], $this->headers)->assertOk();
    $this->patchJson(route('admin.sessions.state.update', $this->session), ['action' => 'unfreeze'], $this->headers)->assertOk();

    $this->session->refresh();

    expect($this->session->config->rules()['freeze'])->toBeFalse();
});

it('blocks joins while frozen and allows them again after unfreeze', function () {
    $token = (string) Str::uuid();

    $this->patchJson(route('admin.sessions.state.update', $this->session), ['action' => 'freeze'], $this->headers)->assertOk();

    $this->post(route('join.store', $this->session), [
        'pin' => $this->session->pin,
        'name' => 'Maya',
        'device_token' => $token,
    ])->assertNotFound();

    $this->patchJson(route('admin.sessions.state.update', $this->session), ['action' => 'unfreeze'], $this->headers)->assertOk();

    $this->post(route('join.store', $this->session), [
        'pin' => $this->session->pin,
        'name' => 'Maya',
        'device_token' => $token,
    ])->assertRedirect(route('session.show', ['session' => $this->session, 'device_token' => $token]));
});

it('archives a session and stops joins while staying viewable', function () {
    $this->patchJson(route('admin.sessions.state.update', $this->session), ['action' => 'archive'], $this->headers)->assertOk();

    $this->session->refresh();
    expect($this->session->status)->toBe('archived');

    $this->post(route('join.store', $this->session), [
        'pin' => $this->session->pin,
        'name' => 'Maya',
        'device_token' => (string) Str::uuid(),
    ])->assertNotFound();

    $this->get(route('session.show', $this->session))->assertOk();
});

it('rejects invalid or repeated terminal state actions', function () {
    $this->patchJson(route('admin.sessions.state.update', $this->session), ['action' => 'bogus'], $this->headers)
        ->assertStatus(422);

    $this->patchJson(route('admin.sessions.state.update', $this->session), ['action' => 'archive'], $this->headers)->assertOk();
    $this->patchJson(route('admin.sessions.state.update', $this->session), ['action' => 'archive'], $this->headers)
        ->assertStatus(422);
});

it('rejects state changes without a valid admin token', function () {
    $this->patchJson(route('admin.sessions.state.update', $this->session), ['action' => 'freeze'])
        ->assertNotFound();
});

it('deletes the session and purges its rows', function () {
    Participant::factory()->create(['group_session_id' => $this->session->id]);
    Event::fake([SessionDeleted::class]);

    $this->deleteJson(route('admin.sessions.destroy', $this->session), [], $this->headers)->assertOk();

    expect(Session::query()->count())->toBe(0)
        ->and(Participant::query()->count())->toBe(0);

    Event::assertDispatched(SessionDeleted::class);
});

it('requires the admin token to delete', function () {
    $this->deleteJson(route('admin.sessions.destroy', $this->session))->assertNotFound();
    expect(Session::query()->count())->toBe(1);
});
