<?php

namespace App\Models;

use App\Casts\SessionConfigCast;
use App\Support\SessionConfig;
use Illuminate\Database\Eloquent\Model;

/**
 * @property-read SessionConfig $config
 */
class SessionTemplate extends Model
{
    protected $table = 'session_templates';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['config' => SessionConfigCast::class];
    }
}
