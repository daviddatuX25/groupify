<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionMessage extends Model
{
    protected $table = 'session_messages';

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<Participant, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(Participant::class, 'author_id');
    }
}
