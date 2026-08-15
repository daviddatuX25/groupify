<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_sessions', function (Blueprint $table) {
            $table->string('qr_token', 64)->nullable()->after('admin_token');
            $table->dateTime('ends_at')->nullable()->after('status');
            $table->dateTime('archived_at')->nullable()->after('ends_at');
            $table->dateTime('purge_at')->nullable()->after('archived_at');
            $table->index(['status', 'ends_at']);
            $table->index(['status', 'purge_at']);
        });

        DB::table('group_sessions')
            ->whereNull('qr_token')
            ->orderBy('id')
            ->get(['id'])
            ->each(function (object $session): void {
                DB::table('group_sessions')
                    ->where('id', $session->id)
                    ->update(['qr_token' => Str::random(64)]);
            });

        DB::table('group_sessions')
            ->where('status', 'archived')
            ->whereNull('archived_at')
            ->orderBy('id')
            ->get(['id', 'updated_at'])
            ->each(function (object $session): void {
                $archivedAt = Carbon::parse($session->updated_at);

                DB::table('group_sessions')
                    ->where('id', $session->id)
                    ->update([
                        'archived_at' => $archivedAt,
                        'purge_at' => $archivedAt->copy()->addDays(30),
                    ]);
            });
    }

    public function down(): void
    {
        Schema::table('group_sessions', function (Blueprint $table) {
            $table->dropIndex(['status', 'ends_at']);
            $table->dropIndex(['status', 'purge_at']);
            $table->dropColumn(['qr_token', 'ends_at', 'archived_at', 'purge_at']);
        });
    }
};
