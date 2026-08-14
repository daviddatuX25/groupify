<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_session_id')->constrained('group_sessions')->cascadeOnDelete();
            $table->foreignId('leader_id')->nullable()->constrained('participants')->nullOnDelete();
            $table->string('name', 80);
            $table->json('field_values');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('groups');
    }
};
