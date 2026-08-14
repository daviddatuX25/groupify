<?php

namespace App\Casts;

use App\Support\SessionConfig;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * @implements CastsAttributes<SessionConfig, array<string, mixed>|SessionConfig>
 */
class SessionConfigCast implements CastsAttributes
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): SessionConfig
    {
        $data = is_string($value) ? json_decode($value, true) : $value;

        return SessionConfig::fromArray(is_array($data) ? $data : []);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): string
    {
        return json_encode($value instanceof SessionConfig ? $value->toArray() : $value, JSON_THROW_ON_ERROR);
    }
}
