<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 6)->unique();
            $table->string('pin', 4);
            $table->string('admin_token', 64)->index();
            $table->string('status', 16)->default('live'); // draft|live|frozen|archived
            $table->json('config');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_sessions');
    }
};
