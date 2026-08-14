<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_session_id')->constrained('group_sessions')->cascadeOnDelete();
            $table->uuid('token');
            $table->string('name', 80);
            $table->string('email', 255)->nullable();
            $table->timestamps();

            // AD-7: one seat per (session, device token)
            $table->unique(['group_session_id', 'token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participants');
    }
};
