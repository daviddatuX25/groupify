<?php

use App\Events\GroupCreated;
use App\Events\MembershipChanged;
use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use App\Models\SessionEvent;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->headers = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
});
it('lets the admin create an empty group with configured capacity', function () {
    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), [
        'rules' => ['min_members' => 2, 'max_members' => 8],
    ])]);

    $this->postJson(route('admin.groups.store', $this->session), [
        'name' => 'Facilitator Group',
        'capacity' => 4,
    ], $this->headers)->assertOk();

    $group = Group::query()->sole();
    expect($group->name)->toBe('Facilitator Group')
        ->and($group->capacity)->toBe(4)
        ->and($group->leader_id)->toBeNull()
        ->and(Membership::query()->count())->toBe(0);
});

it('requires the admin token to create a group', function () {
    $this->postJson(route('admin.groups.store', $this->session), ['name' => 'Nope'])
        ->assertNotFound();
});

it('creates a batch of sequential groups continuing from existing groups', function () {
    Group::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Team Alpha']);

    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 3], $this->headers)
        ->assertOk()
        ->assertJson(['ok' => true, 'count' => 3]);

    expect(Group::query()->orderBy('id')->pluck('name')->all())->toBe([
        'Team Alpha', 'Team Bravo', 'Team Charlie', 'Team Delta',
    ])->and(Membership::query()->count())->toBe(0);
});

it('creates a batch of distinct random-named groups', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 5, 'random_names' => true], $this->headers)
        ->assertOk();

    $names = Group::query()->pluck('name')->all();

    expect($names)->toHaveCount(5)
        ->and(count(array_unique($names)))->toBe(5);
});

it('creates a single group through the bulk endpoint with count 1', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 1], $this->headers)
        ->assertOk();

    expect(Group::query()->count())->toBe(1)
        ->and(Group::query()->sole()->name)->toBe('Team Alpha');
});

it('applies the shared capacity to every bulk group', function () {
    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), [
        'rules' => ['min_members' => 2, 'max_members' => 8],
    ])]);

    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 3, 'capacity' => 4], $this->headers)
        ->assertOk();

    expect(Group::query()->pluck('capacity')->all())->toBe([4, 4, 4]);
});

it('rejects bulk creation without the admin token', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 2])
        ->assertNotFound();

    expect(Group::query()->count())->toBe(0);
});

it('rejects bulk creation without a count', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), [], $this->headers)
        ->assertStatus(422);

    expect(Group::query()->count())->toBe(0);
});

it('rejects invalid bulk counts', function (mixed $count) {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => $count], $this->headers)
        ->assertStatus(422);

    expect(Group::query()->count())->toBe(0);
})->with([
    'zero' => 0,
    'above max' => 201,
    'negative' => -1,
    'non-integer' => 1.5,
    'non-numeric string' => 'abc',
]);

it('rejects bulk capacity below the session minimum', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 2, 'capacity' => 2], $this->headers)
        ->assertStatus(422);

    expect(Group::query()->count())->toBe(0);
});

it('rejects bulk capacity above the session maximum', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 2, 'capacity' => 7], $this->headers)
        ->assertStatus(422);

    expect(Group::query()->count())->toBe(0);
});

it('rolls back the whole batch when any group fails', function () {
    $inserts = 0;
    Group::creating(function () use (&$inserts) {
        $inserts++;

        if ($inserts === 2) {
            throw new RuntimeException('boom');
        }
    });

    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 4], $this->headers)
        ->assertServerError();

    expect(Group::query()->count())->toBe(0);
});

it('keeps random names unique when the dictionary is exhausted', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 25, 'random_names' => true], $this->headers)
        ->assertOk();

    $names = Group::query()->pluck('name')->all();

    expect($names)->toHaveCount(25)
        ->and(count(array_unique($names)))->toBe(25);
});

it('rejects a manual name sent to the bulk endpoint', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 2, 'name' => 'Nope'], $this->headers)
        ->assertStatus(422);

    expect(Group::query()->count())->toBe(0);
});

it('creates bulk groups with the table naming scheme', function () {
    $this->session->update(['config' => array_replace_recursive($this->session->config->toArray(), [
        'rules' => ['naming' => 'table'],
    ])]);
    Group::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Table 1']);

    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 2], $this->headers)
        ->assertOk();

    expect(Group::query()->orderBy('id')->pluck('name')->all())->toBe(['Table 1', 'Table 2', 'Table 3']);
});

it('accepts a bulk count of exactly 200', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 200], $this->headers)
        ->assertOk()
        ->assertJson(['count' => 200]);

    expect(Group::query()->count())->toBe(200);
});

it('accepts bulk capacity exactly at the session bounds', function () {
    // Default rules: min_members 3, max_members 6.
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 2, 'capacity' => 3], $this->headers)
        ->assertOk();
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 2, 'capacity' => 6], $this->headers)
        ->assertOk();

    expect(Group::query()->pluck('capacity')->all())->toBe([3, 3, 6, 6]);
});

it('rejects bulk creation with a wrong admin token', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 2], [
        'X-Admin-Token' => 'wrong-token',
        'Accept' => 'application/json',
    ])->assertNotFound();

    expect(Group::query()->count())->toBe(0);
});

it('returns the created names and count in the bulk response', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 2], $this->headers)
        ->assertOk()
        ->assertJson([
            'ok' => true,
            'count' => 2,
            'names' => ['Team Alpha', 'Team Bravo'],
        ]);
});

it('treats an explicit random_names false as sequential naming', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 2, 'random_names' => false], $this->headers)
        ->assertOk();

    expect(Group::query()->orderBy('id')->pluck('name')->all())->toBe(['Team Alpha', 'Team Bravo']);
});

it('random bulk skips names already taken by existing groups', function () {
    $existing = Group::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Aurora']);

    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 25, 'random_names' => true], $this->headers)
        ->assertOk();

    $names = Group::query()->pluck('name')->all();
    $newNames = Group::query()->where('id', '>', $existing->id)->pluck('name')->all();

    expect($names)->toHaveCount(26)
        ->and(array_unique(array_map('mb_strtolower', $names)))->toHaveCount(26)
        ->and($newNames)->toHaveCount(25)
        ->and($newNames)->not->toContain('Aurora');
});

it('records one aggregate activity event for a bulk creation', function () {
    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 4, 'random_names' => true], $this->headers)
        ->assertOk();

    $events = SessionEvent::query()
        ->where('group_session_id', $this->session->id)
        ->where('type', 'groups_created')
        ->get();

    expect($events)->toHaveCount(1);

    $payload = $events->first()->payload;

    expect($payload['count'])->toBe(4)
        ->and($payload['by'])->toBe('admin')
        ->and($payload['group_ids'])->toHaveCount(4)
        ->and($payload['names'])->toHaveCount(4);
});

it('broadcasts one GroupCreated event per bulk group', function () {
    Event::fake([GroupCreated::class]);

    $this->postJson(route('admin.groups.bulk', $this->session), ['count' => 3], $this->headers)
        ->assertOk();

    Event::assertDispatched(GroupCreated::class, 3);
});

it('serves the board to the admin with is_admin and stats', function () {
    Participant::factory()->count(3)->create(['group_session_id' => $this->session->id]);
    Group::factory()->create(['group_session_id' => $this->session->id]);

    $this->getJson(route('board.show', $this->session), $this->headers)
        ->assertOk()
        ->assertJson([
            'is_admin' => true,
            'presence' => 3,
            'code' => $this->session->code,
        ])
        ->assertJsonCount(1, 'groups');
});

it('moves a member to another group and broadcasts', function () {
    Event::fake([MembershipChanged::class]);
    $alpha = Group::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Team Alpha']);
    $bravo = Group::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Team Bravo']);
    $maya = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $alpha->memberships()->create(['participant_id' => $maya->id, 'role' => 'member']);

    $this->postJson(route('admin.members.move', [$this->session, $maya]), ['to_group_id' => $bravo->id], $this->headers)
        ->assertOk();

    expect(Membership::query()->where('group_id', $alpha->id)->count())->toBe(0)
        ->and(Membership::query()->where('group_id', $bravo->id)->where('participant_id', $maya->id)->count())->toBe(1);

    Event::assertDispatched(MembershipChanged::class);
});

it('moves a member to the pool (kick)', function () {
    $alpha = Group::factory()->create(['group_session_id' => $this->session->id]);
    $maya = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $alpha->memberships()->create(['participant_id' => $maya->id, 'role' => 'member']);

    $this->postJson(route('admin.members.move', [$this->session, $maya]), ['to_group_id' => null], $this->headers)
        ->assertOk();

    expect(Membership::query()->count())->toBe(0);
});

it('transfers leadership when the admin moves a leader', function () {
    $alpha = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => null]);
    $maya = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $leo = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $alpha->memberships()->create(['participant_id' => $maya->id, 'role' => 'leader']);
    $alpha->memberships()->create(['participant_id' => $leo->id, 'role' => 'member']);

    $this->postJson(route('admin.members.move', [$this->session, $maya]), ['to_group_id' => null], $this->headers)
        ->assertOk();

    $alpha->refresh();
    expect($alpha->leader_id)->toBe($leo->id)
        ->and($alpha->memberships()->where('participant_id', $leo->id)->first()->role)->toBe('leader');
});

it('rejects admin actions without a valid token', function () {
    $maya = Participant::factory()->create(['group_session_id' => $this->session->id]);

    $this->postJson(route('admin.members.move', [$this->session, $maya]), ['to_group_id' => null])
        ->assertNotFound();
});

it('dissolves all groups back to the pool', function () {
    $alpha = Group::factory()->create(['group_session_id' => $this->session->id]);
    $bravo = Group::factory()->create(['group_session_id' => $this->session->id]);
    $a = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $b = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $alpha->memberships()->create(['participant_id' => $a->id, 'role' => 'leader']);
    $bravo->memberships()->create(['participant_id' => $b->id, 'role' => 'member']);

    $this->postJson(route('admin.dissolve', $this->session), [], $this->headers)->assertOk();

    expect(Membership::query()->count())->toBe(0);
});

it('dissolves a single group only', function () {
    $alpha = Group::factory()->create(['group_session_id' => $this->session->id]);
    $bravo = Group::factory()->create(['group_session_id' => $this->session->id]);
    $a = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $b = Participant::factory()->create(['group_session_id' => $this->session->id]);
    $alpha->memberships()->create(['participant_id' => $a->id, 'role' => 'leader']);
    $bravo->memberships()->create(['participant_id' => $b->id, 'role' => 'member']);

    $this->postJson(route('admin.dissolve', $this->session), ['group_id' => $alpha->id], $this->headers)->assertOk();

    expect(Membership::query()->count())->toBe(1)
        ->and(Membership::query()->where('group_id', $bravo->id)->count())->toBe(1);
});
