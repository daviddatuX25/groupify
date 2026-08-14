<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('session_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_session_id')->constrained('group_sessions')->cascadeOnDelete();
            $table->string('type', 40);
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['group_session_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_events');
    }
};
