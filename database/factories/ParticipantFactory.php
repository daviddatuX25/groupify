<?php

namespace Database\Factories;

use App\Models\Participant;
use App\Models\Session;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Participant>
 */
class ParticipantFactory extends Factory
{
    protected $model = Participant::class;

    public function definition(): array
    {
        return [
            'group_session_id' => Session::factory(),
            'token' => (string) Str::uuid(),
            'name' => fake()->firstName(),
            'email' => fake()->optional()->safeEmail(),
        ];
    }
}
