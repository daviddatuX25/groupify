<?php

namespace App\Models;

use App\Casts\SessionConfigCast;
use App\Support\SessionConfig;
use Database\Factories\SessionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read SessionConfig $config
 */
class Session extends Model
{
    /** @use HasFactory<SessionFactory> */
    use HasFactory;

    protected $table = 'group_sessions'; // "sessions" is Laravel's session-storage table

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'config' => SessionConfigCast::class,
        ];
    }

    /**
     * @return HasMany<Group, $this>
     */
    public function groups(): HasMany
    {
        return $this->hasMany(Group::class, 'group_session_id');
    }

    /**
     * @return HasMany<SessionEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(SessionEvent::class, 'group_session_id');
    }
}
