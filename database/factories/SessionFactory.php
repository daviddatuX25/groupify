<?php

namespace Database\Factories;

use App\Models\Session;
use App\Support\SessionConfig;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Session>
 */
class SessionFactory extends Factory
{
    protected $model = Session::class;

    public function definition(): array
    {
        return [
            'code' => (string) random_int(100000, 999999),
            'pin' => (string) random_int(1000, 9999),
            'admin_token' => Str::random(40),
            'qr_token' => Str::random(64),
            'status' => 'live',
            'config' => SessionConfig::defaults(),
        ];
    }
}
