<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_session_id')->constrained('group_sessions')->cascadeOnDelete();
            $table->foreignId('group_id')->nullable()->constrained('groups')->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('participants')->nullOnDelete();
            $table->string('scope', 20); // announcement | group
            $table->text('body');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['group_session_id', 'scope', 'created_at']);
            $table->index(['group_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_messages');
    }
};
