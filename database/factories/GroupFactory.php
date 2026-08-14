<?php

namespace Database\Factories;

use App\Models\Group;
use App\Models\Session;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Group>
 */
class GroupFactory extends Factory
{
    protected $model = Group::class;

    public function definition(): array
    {
        return [
            'group_session_id' => Session::factory(),
            'leader_id' => null,
            'name' => 'Team '.fake()->unique()->word(),
            'field_values' => [],
        ];
    }
}
