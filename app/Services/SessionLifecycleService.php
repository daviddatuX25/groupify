<?php

namespace App\Services;

use App\Models\Session;
use Carbon\CarbonInterface;

final class SessionLifecycleService
{
    public function archive(Session $session, ?CarbonInterface $at = null): bool
    {
        if ($session->status === 'archived') {
            return false;
        }

        $archivedAt = $at ?? now();
        $retentionDays = $session->config->rules()['retention_days'] ?? 30;
        $retentionDays = is_numeric($retentionDays) ? (int) $retentionDays : 30;

        $session->update([
            'status' => 'archived',
            'archived_at' => $archivedAt,
            'purge_at' => $retentionDays > 0 ? $archivedAt->copy()->addDays($retentionDays) : null,
        ]);

        return true;
    }
}
