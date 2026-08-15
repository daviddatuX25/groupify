<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('participants', function (Blueprint $table): void {
            $table->string('avatar_style', 40)->nullable()->after('display_name');
            $table->string('avatar_seed', 80)->nullable()->after('avatar_style');
        });
    }

    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table): void {
            $table->dropColumn(['avatar_style', 'avatar_seed']);
        });
    }
};
