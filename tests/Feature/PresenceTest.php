<?php

use App\Models\Participant;
use App\Models\Session;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Contracts\Broadcasting\Broadcaster;
use Illuminate\Contracts\Broadcasting\Factory;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    // Exercise the real presence-auth path: the global test broadcast driver
    // is null (broadcasts no-op everywhere else), so flip to reverb for this
    // suite, drop the boot-time singleton (created on the null driver), and
    // re-register the channel on the reverb driver.
    config(['broadcasting.default' => 'reverb']);
    app()->forgetInstance(BroadcastManager::class);
    app()->forgetInstance(Factory::class);
    app()->forgetInstance(Broadcaster::class);
    Broadcast::channel('session.{code}', function (mixed $user) {
        if ($user === null) {
            return null;
        }

        return ['name' => $user instanceof Participant ? ($user->display_name ?? $user->name) : $user->name];
    });

    $this->session = Session::factory()->create();
});

it('authenticates a participant for the presence channel (FR-3.5)', function () {
    $participant = Participant::factory()->create([
        'group_session_id' => $this->session->id,
        'display_name' => 'Swift Fox',
    ]);

    $response = $this->postJson('/broadcasting/auth', [
        'channel_name' => 'presence-session.'.$this->session->code,
        'socket_id' => '1234.5678',
    ], ['X-Device-Token' => $participant->token])
        ->assertOk()
        ->assertJsonStructure(['auth', 'channel_data']);

    $channelData = json_decode((string) $response->json('channel_data'), true);

    expect($response->json('auth'))->not->toBeEmpty()
        ->and($channelData['user_info']['name'] ?? null)->toBe('Swift Fox');
});

it('authenticates the admin for the presence channel', function () {
    $this->postJson('/broadcasting/auth', [
        'channel_name' => 'presence-session.'.$this->session->code,
        'socket_id' => '1234.5678',
    ], ['X-Admin-Token' => $this->session->admin_token])
        ->assertOk()
        ->assertJsonStructure(['auth']);
});

it('rejects presence auth without a valid token', function () {
    $this->postJson('/broadcasting/auth', [
        'channel_name' => 'presence-session.'.$this->session->code,
        'socket_id' => '1234.5678',
    ])->assertStatus(403);
});

it('rejects presence auth for an unknown channel shape', function () {
    $participant = Participant::factory()->create(['group_session_id' => $this->session->id]);

    $this->postJson('/broadcasting/auth', [
        'channel_name' => 'private-session.'.$this->session->code,
        'socket_id' => '1234.5678',
    ], ['X-Device-Token' => $participant->token])
        ->assertStatus(403);
});

it('exposes display names as presence member data', function () {
    $participant = Participant::factory()->create([
        'group_session_id' => $this->session->id,
        'name' => 'Maya',
        'display_name' => 'Swift Fox',
    ]);

    $response = $this->postJson('/broadcasting/auth', [
        'channel_name' => 'presence-session.'.$this->session->code,
        'socket_id' => '1234.5678',
    ], ['X-Device-Token' => $participant->token])
        ->assertOk();

    $channelData = json_decode((string) $response->json('channel_data'), true);

    expect($channelData['user_info']['name'])->toBe('Swift Fox');
});
