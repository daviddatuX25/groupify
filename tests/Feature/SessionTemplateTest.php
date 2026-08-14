<?php

use App\Events\SessionConfigUpdated;
use App\Models\Session;
use App\Models\SessionTemplate;
use App\Support\SessionConfig;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->adminHeaders = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
});

it('saves the current session config as a template', function () {
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'rules' => ['min_members' => 2, 'max_members' => 4],
        'fields' => [['name' => 'Chosen topic', 'type' => 'text']],
    ])]);

    $this->postJson(route('admin.templates.store', $this->session), ['name' => 'Classroom'], $this->adminHeaders)
        ->assertOk();

    $template = SessionTemplate::query()->sole();

    expect($template->name)->toBe('Classroom')
        ->and($template->config->rules()['min_members'])->toBe(2)
        ->and($template->config->fields())->toHaveCount(1);
});

it('lists templates', function () {
    SessionTemplate::query()->create(['name' => 'Classroom', 'config' => SessionConfig::defaults()]);

    $this->getJson(route('admin.templates.index', $this->session), $this->adminHeaders)
        ->assertOk()
        ->assertJsonCount(1, 'templates')
        ->assertJsonPath('templates.0.name', 'Classroom');
});

it('applies a template to a session and broadcasts', function () {
    Event::fake([SessionConfigUpdated::class]);
    $template = SessionTemplate::query()->create(['name' => 'Classroom', 'config' => array_replace_recursive(SessionConfig::defaults(), [
        'rules' => ['max_members' => 4],
    ])]);

    $this->postJson(route('admin.templates.apply', [$this->session, $template]), [], $this->adminHeaders)
        ->assertOk();

    $this->session->refresh();

    expect($this->session->config->rules()['max_members'])->toBe(4);

    Event::assertDispatched(SessionConfigUpdated::class);
});

it('creates a session from a template', function () {
    $template = SessionTemplate::query()->create(['name' => 'Classroom', 'config' => array_replace_recursive(SessionConfig::defaults(), [
        'rules' => ['max_members' => 8],
    ])]);

    $this->postJson(route('sessions.store'), ['template_id' => $template->id])->assertRedirect();

    $session = Session::query()->where('id', '!=', $this->session->id)->sole();

    expect($session->config->rules()['max_members'])->toBe(8);
});

it('rejects saving a template without an admin token', function () {
    $this->postJson(route('admin.templates.store', $this->session), ['name' => 'Nope'])
        ->assertNotFound();
});
