<?php

namespace App\Models;

use Database\Factories\ParticipantFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Participant extends Model
{
    /** @use HasFactory<ParticipantFactory> */
    use HasFactory;

    protected $table = 'participants';

    protected $guarded = [];

    /**
     * @return BelongsTo<Session, $this>
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(Session::class, 'group_session_id');
    }

    /** Broadcast presence auth needs an Authenticatable-shaped user (FR-3.5). */
    public function getAuthIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getAuthIdentifierForBroadcasting(): mixed
    {
        return $this->getKey();
    }
}
