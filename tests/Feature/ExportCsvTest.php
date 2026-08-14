<?php

use App\Models\Group;
use App\Models\Participant;
use App\Models\Session;
use App\Support\SessionConfig;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->headers = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'text/csv'];
});

it('exports CSV with group, name, email, and dynamic field columns', function () {
    $this->session->update(['config' => array_replace_recursive(SessionConfig::defaults(), [
        'fields' => [['name' => 'Chosen topic', 'type' => 'text', 'required' => true]],
    ])]);

    $group = Group::factory()->create([
        'group_session_id' => $this->session->id,
        'name' => 'Team Alpha',
        'field_values' => ['Chosen topic' => 'AI Healthcare App'],
    ]);
    $maya = Participant::factory()->create([
        'group_session_id' => $this->session->id,
        'name' => 'Maya',
        'email' => 'maya@example.com',
    ]);
    $group->memberships()->create(['participant_id' => $maya->id, 'role' => 'leader']);

    Participant::factory()->create([
        'group_session_id' => $this->session->id,
        'name' => 'Leo',
        'email' => null,
    ]);

    $response = $this->get(route('admin.export', $this->session), $this->headers)->assertOk();

    expect($response->headers->get('content-type'))->toContain('text/csv')
        ->and($response->streamedContent())
        ->toContain('group,name,email,"Chosen topic"')
        ->toContain('"Team Alpha",Maya,maya@example.com,"AI Healthcare App"')
        ->toContain('(pool),Leo,,');
});

it('rejects export without a valid admin token', function () {
    $this->get(route('admin.export', $this->session))->assertNotFound();
});
