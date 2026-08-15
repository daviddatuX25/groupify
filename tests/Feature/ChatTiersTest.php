<?php

use App\Events\MessageCreated;
use App\Models\Group;
use App\Models\Participant;
use App\Models\Session;
use App\Models\SessionMessage;
use App\Support\SessionConfig;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->session->update(['config' => SessionConfig::deepMerge($this->session->config->toArray(), ['extensions' => ['announcements', 'moderation']])]);
    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), [
        'rules' => ['chat_enabled' => true],
    ])]);

    $this->leader = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Maya']);
    $this->group = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => $this->leader->id]);
    $this->group->memberships()->create(['participant_id' => $this->leader->id, 'role' => 'leader']);
    $this->member = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Leo']);
    $this->group->memberships()->create(['participant_id' => $this->member->id, 'role' => 'member']);
    $this->outsider = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Zoe']);

    $this->adminHeaders = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
    $this->memberHeaders = ['X-Device-Token' => $this->member->token, 'Accept' => 'application/json'];
    $this->leaderHeaders = ['X-Device-Token' => $this->leader->token, 'Accept' => 'application/json'];
    $this->outsiderHeaders = ['X-Device-Token' => $this->outsider->token, 'Accept' => 'application/json'];
});

it('lets the admin post an announcement visible to everyone', function () {
    Event::fake([MessageCreated::class]);

    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'announcement',
        'body' => 'Session starts in 5 minutes!',
    ], $this->adminHeaders)->assertOk();

    expect(SessionMessage::query()->sole()->body)->toBe('Session starts in 5 minutes!');

    Event::assertDispatched(MessageCreated::class);
});

it('rejects announcements from non-admins', function () {
    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'announcement',
        'body' => 'Sneaky',
    ], $this->memberHeaders)->assertNotFound();

    expect(SessionMessage::query()->count())->toBe(0);
});

it('lets group members chat in their group only', function () {
    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'group',
        'group_id' => $this->group->id,
        'body' => 'Hello team',
    ], $this->memberHeaders)->assertOk();

    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'group',
        'group_id' => $this->group->id,
        'body' => 'Intrusion',
    ], $this->outsiderHeaders)->assertNotFound();
});

it('enforces leader-only group chat when configured', function () {
    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), [
        'rules' => ['chat_enabled' => true, 'group_chat_mode' => 'leader'],
    ])]);

    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'group',
        'group_id' => $this->group->id,
        'body' => 'Team!',
    ], $this->memberHeaders)->assertStatus(422);

    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'group',
        'group_id' => $this->group->id,
        'body' => 'Team!',
    ], $this->leaderHeaders)->assertOk();
});

it('indexes announcements for everyone and group chat only for members', function () {
    SessionMessage::query()->create(['group_session_id' => $this->session->id, 'scope' => 'announcement', 'body' => 'Hi all']);
    SessionMessage::query()->create(['group_session_id' => $this->session->id, 'group_id' => $this->group->id, 'scope' => 'group', 'body' => 'Secret']);

    $this->getJson(route('messages.index', $this->session), $this->outsiderHeaders)
        ->assertOk()
        ->assertJsonCount(1, 'messages')
        ->assertJsonPath('messages.0.scope', 'announcement');

    $this->getJson(route('messages.index', $this->session), $this->memberHeaders)
        ->assertOk()
        ->assertJsonCount(2, 'messages');
});

it('disables chat entirely when the flag is off', function () {
    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), [
        'rules' => ['chat_enabled' => false],
    ])]);

    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'announcement',
        'body' => 'Hi',
    ], $this->adminHeaders)->assertNotFound();

    $this->getJson(route('messages.index', $this->session), $this->memberHeaders)->assertNotFound();
});

it('validates the message body', function () {
    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'announcement',
        'body' => '',
    ], $this->adminHeaders)->assertStatus(422)->assertJsonValidationErrors('body');
});

it('lets any participant post to the global hub visible to everyone', function () {
    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'global',
        'body' => 'Anyone looking for a group?',
    ], $this->outsiderHeaders)->assertOk();

    $this->getJson(route('messages.index', $this->session), $this->outsiderHeaders)
        ->assertOk()
        ->assertJsonPath('messages.0.scope', 'global')
        ->assertJsonPath('messages.0.body', 'Anyone looking for a group?');
});

it('mutes global chat writes when configured', function () {
    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), [
        'rules' => ['chat_enabled' => true, 'global_chat_mode' => 'muted'],
    ])]);

    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'global',
        'body' => 'Hello',
    ], $this->outsiderHeaders)->assertStatus(422);

    $this->getJson(route('messages.index', $this->session), $this->outsiderHeaders)->assertOk(); // reads still work
});

it('queues global posts for moderation and lets the admin approve or reject', function () {
    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), [
        'rules' => ['chat_enabled' => true, 'global_chat_mode' => 'moderated'],
    ])]);

    $this->postJson(route('messages.store', $this->session), [
        'scope' => 'global',
        'body' => 'Helpful question',
    ], $this->outsiderHeaders)->assertOk();

    $pending = SessionMessage::query()->where('status', 'pending')->sole();

    // Invisible to participants until approved
    $this->getJson(route('messages.index', $this->session), $this->outsiderHeaders)
        ->assertOk()
        ->assertJsonCount(0, 'messages');

    // Admin list + approve
    $this->getJson(route('admin.messages.pending', $this->session), $this->adminHeaders)
        ->assertOk()
        ->assertJsonCount(1, 'messages')
        ->assertJsonPath('messages.0.body', 'Helpful question');

    $this->postJson(route('admin.messages.decide', [$this->session, $pending]), ['action' => 'approve'], $this->adminHeaders)
        ->assertOk();

    $this->getJson(route('messages.index', $this->session), $this->outsiderHeaders)
        ->assertOk()
        ->assertJsonCount(1, 'messages');

    // Reject path
    $this->postJson(route('messages.store', $this->session), ['scope' => 'global', 'body' => 'Spam'], $this->outsiderHeaders)->assertOk();
    $spam = SessionMessage::query()->where('body', 'Spam')->sole();
    $this->postJson(route('admin.messages.decide', [$this->session, $spam]), ['action' => 'reject'], $this->adminHeaders)->assertOk();

    expect(SessionMessage::query()->where('body', 'Spam')->count())->toBe(0);
});
