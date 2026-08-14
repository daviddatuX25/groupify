<?php

use App\Console\Commands\PurgeGhostGroups;
use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(PreventRequestForgery::class);

    $this->session = Session::factory()->create();
    $this->adminHeaders = ['X-Admin-Token' => $this->session->admin_token, 'Accept' => 'application/json'];
});

function makeGroupWithLeader(Session $session, string $leaderName, array $memberNames = []): array
{
    $leader = Participant::factory()->create(['group_session_id' => $session->id, 'name' => $leaderName]);
    $group = Group::factory()->create(['group_session_id' => $session->id, 'leader_id' => $leader->id]);
    $group->memberships()->create(['participant_id' => $leader->id, 'role' => 'leader']);

    $members = [];
    foreach ($memberNames as $name) {
        $m = Participant::factory()->create(['group_session_id' => $session->id, 'name' => $name]);
        $group->memberships()->create(['participant_id' => $m->id, 'role' => 'member']);
        $members[] = $m;
    }

    return [$group, $leader, $members];
}

it('transfers leadership to the oldest member when the admin bans the leader', function () {
    [$group, $leader, $members] = makeGroupWithLeader($this->session, 'Maya', ['Ana', 'Ben']);

    $this->postJson(route('admin.members.ban', [$this->session, $leader]), ['banned' => true], $this->adminHeaders)->assertOk();

    expect($group->fresh()->leader_id)->toBe($members[0]->id)
        ->and(Membership::query()->where('group_id', $group->id)->where('participant_id', $members[0]->id)->value('role'))->toBe('leader');
});

it('dissolves the group when the admin bans the last member', function () {
    [$group, $leader] = makeGroupWithLeader($this->session, 'Maya');

    $this->postJson(route('admin.members.ban', [$this->session, $leader]), ['banned' => true], $this->adminHeaders)->assertOk();

    expect(Group::query()->where('id', $group->id)->exists())->toBeFalse();
});

it('lets the admin transfer leadership to any active member', function () {
    [$group, $leader, $members] = makeGroupWithLeader($this->session, 'Maya', ['Ana']);

    $this->postJson(route('admin.groups.leader', [$this->session, $group]), ['participant_id' => $members[0]->id], $this->adminHeaders)->assertOk();

    expect($group->fresh()->leader_id)->toBe($members[0]->id)
        ->and(Membership::query()->where('group_id', $group->id)->where('participant_id', $leader->id)->value('role'))->toBe('member')
        ->and(Membership::query()->where('group_id', $group->id)->where('participant_id', $members[0]->id)->value('role'))->toBe('leader');
});

it('rejects a transfer to someone who is not an active member', function () {
    [$group, $leader] = makeGroupWithLeader($this->session, 'Maya');
    $outsider = Participant::factory()->create(['group_session_id' => $this->session->id]);

    $this->postJson(route('admin.groups.leader', [$this->session, $group]), ['participant_id' => $outsider->id], $this->adminHeaders)
        ->assertStatus(422);
});

it('rejects transfers without an admin token', function () {
    [$group, $leader, $members] = makeGroupWithLeader($this->session, 'Maya', ['Ana']);

    $this->postJson(route('admin.groups.leader', [$this->session, $group]), ['participant_id' => $members[0]->id])
        ->assertNotFound();
});

it('purges empty and leaderless groups and rebalances the rest', function () {
    [$emptyGroup, $leader] = makeGroupWithLeader($this->session, 'Maya');

    [$ghostLeader, $ghostGroup, $ghostMembers] = null;
    $gl = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Ghost']);
    $ghostGroup = Group::factory()->create(['group_session_id' => $this->session->id, 'leader_id' => null]);
    $member = Participant::factory()->create(['group_session_id' => $this->session->id, 'name' => 'Kept']);
    $ghostGroup->memberships()->create(['participant_id' => $member->id, 'role' => 'member']);

    // empty group: leader already left
    Membership::query()->where('group_id', $emptyGroup->id)->delete();

    $this->artisan(PurgeGhostGroups::class)->assertSuccessful();

    expect(Group::query()->where('id', $emptyGroup->id)->exists())->toBeFalse()
        ->and($ghostGroup->fresh()->leader_id)->toBe($member->id)
        ->and(Membership::query()->where('group_id', $ghostGroup->id)->where('participant_id', $member->id)->value('role'))->toBe('leader');
});
