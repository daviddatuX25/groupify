<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained('groups')->cascadeOnDelete();
            $table->foreignId('participant_id')->constrained('participants')->cascadeOnDelete();
            $table->string('role', 16)->default('member'); // leader | member
            $table->string('status', 16)->default('active'); // active | pending (approval mode later)
            $table->timestamps();

            // AD-7: one seat per group per participant
            $table->unique(['group_id', 'participant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('memberships');
    }
};
