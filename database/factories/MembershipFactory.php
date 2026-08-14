<?php

namespace Database\Factories;

use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Membership>
 */
class MembershipFactory extends Factory
{
    protected $model = Membership::class;

    public function definition(): array
    {
        return [
            'group_id' => Group::factory(),
            'participant_id' => Participant::factory(),
            'role' => 'member',
            'status' => 'active',
        ];
    }
}
