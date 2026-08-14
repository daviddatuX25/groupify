<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('session_messages', function (Blueprint $table) {
            $table->string('status', 16)->default('visible')->after('scope'); // visible | pending
        });
    }

    public function down(): void
    {
        Schema::table('session_messages', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
