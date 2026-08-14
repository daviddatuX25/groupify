<?php

use App\Events\MembershipChanged;
use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
});

it('computes dissolve_at when the timer is set via config', function () {
    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['rules' => ['auto_dissolve_minutes' => 5]],
        ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json']
    )->assertOk();

    $this->session->refresh();

    expect($this->session->dissolve_at)->not->toBeNull()
        ->and($this->session->dissolve_at->isFuture())->toBeTrue();
});

it('clears dissolve_at when the timer is disabled', function () {
    $this->session->update(['dissolve_at' => now()->addMinutes(5)]);

    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['rules' => ['auto_dissolve_minutes' => null]],
        ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json']
    )->assertOk();

    expect($this->session->fresh()->dissolve_at)->toBeNull();
});

it('dissolves groups when the timer expires', function () {
    $group = Group::factory()->create(['group_session_id' => $this->session->id]);
    $leader = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $member = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $group->memberships()->create(['participant_id' => $leader->id, 'role' => 'leader']);
    $group->memberships()->create(['participant_id' => $member->id, 'role' => 'member']);

    $this->session->update(['dissolve_at' => now()->subMinute()]);

    Event::fake([MembershipChanged::class]);

    $this->artisan('sessions:auto-dissolve')->assertSuccessful();

    expect(Membership::query()->count())->toBe(0)
        ->and($this->session->fresh()->dissolve_at)->toBeNull();

    Event::assertDispatched(MembershipChanged::class);
});

it('is idempotent — running again changes nothing', function () {
    $group = Group::factory()->create(['group_session_id' => $this->session->id]);
    $group->memberships()->create(['participant_id' => Participant::factory()->create(['group_session_id' => $this->session->id])->id, 'role' => 'member']);
    $this->session->update(['dissolve_at' => now()->subMinute()]);

    $this->artisan('sessions:auto-dissolve')->assertSuccessful();
    $this->artisan('sessions:auto-dissolve')->assertSuccessful();

    expect(Membership::query()->count())->toBe(0);
});

it('leaves sessions with a future timer alone', function () {
    $group = Group::factory()->create(['group_session_id' => $this->session->id]);
    $group->memberships()->create(['participant_id' => Participant::factory()->create(['group_session_id' => $this->session->id])->id, 'role' => 'member']);
    $this->session->update(['dissolve_at' => now()->addMinutes(5)]);

    $this->artisan('sessions:auto-dissolve')->assertSuccessful();

    expect(Membership::query()->count())->toBe(1);
});

it('rejects an invalid timer value', function () {
    $this->putJson(
        route('admin.sessions.config.update', $this->session),
        ['rules' => ['auto_dissolve_minutes' => 0]],
        ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json']
    )->assertStatus(422)->assertJsonValidationErrors('rules.auto_dissolve_minutes');
});
