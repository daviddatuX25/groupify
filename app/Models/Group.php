<?php

namespace App\Models;

use Database\Factories\GroupFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read int $member_count (from withCount in SessionSnapshot)
 */
class Group extends Model
{
    /** @use HasFactory<GroupFactory> */
    use HasFactory;

    protected $table = 'groups';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['field_values' => 'array'];
    }

    /**
     * @return BelongsTo<Session, $this>
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(Session::class, 'group_session_id');
    }

    /**
     * @return BelongsTo<Participant, $this>
     */
    public function leader(): BelongsTo
    {
        return $this->belongsTo(Participant::class, 'leader_id');
    }

    /** Capacity for this group (null = session max). Delegated size (FR-4.5). */
    public function effectiveCapacity(Session $session): int
    {
        return $this->capacity ?? (int) $session->config->rules()['max_members'];
    }

    public function openSlots(Session $session): int
    {
        $active = $this->memberships()->where('status', 'active')->count();

        return max(0, $this->effectiveCapacity($session) - $active);
    }

    /**
     * @return HasMany<Membership, $this>
     */
    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }
}
