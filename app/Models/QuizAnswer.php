<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuizAnswer extends Model
{
    protected $fillable = [
        'group_session_id', 'group_id', 'participant_id', 'question_index', 'answer_index', 'points',
    ];
}
