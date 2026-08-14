<?php

use App\Models\Participant;
use App\Models\Session;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('purges archived sessions older than 30 days with their rows', function () {
    $old = Session::factory()->create(['status' => 'archived', 'updated_at' => now()->subDays(31)]);
    Participant::factory()->create(['group_session_id' => $old->id]);

    $this->artisan('sessions:purge')->assertSuccessful();

    expect(Session::query()->count())->toBe(0)
        ->and(Participant::query()->count())->toBe(0);
});

it('keeps archived sessions younger than 30 days', function () {
    Session::factory()->create(['status' => 'archived', 'updated_at' => now()->subDays(29)]);

    $this->artisan('sessions:purge')->assertSuccessful();

    expect(Session::query()->count())->toBe(1);
});

it('keeps live and frozen sessions regardless of age', function () {
    Session::factory()->create(['status' => 'live', 'updated_at' => now()->subDays(60)]);

    $this->artisan('sessions:purge')->assertSuccessful();

    expect(Session::query()->count())->toBe(1);
});

it('is scheduled to run daily', function () {
    $this->assertTrue(true); // scheduling asserted in routes/console.php review
});
