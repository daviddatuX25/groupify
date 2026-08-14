<?php

namespace App\Http\Controllers\Admin;

use App\Models\Group;
use App\Models\Membership;
use App\Models\Participant;
use App\Models\Session;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * CSV export (FR-5.5): group / name / email + every configured field as a
 * dynamic column (AD-8 — fields are config, not schema).
 */
class AdminExportController
{
    use AuthorizesAdminToken;

    public function csv(Request $request, Session $session): StreamedResponse
    {
        $this->authorizeAdmin($session, $request);

        $fields = collect($session->config->fields())->map(fn ($f) => (string) $f['name'])->values();
        $anonymous = $session->config->rules()['anonymous_mode'] ?? false;

        $groupByParticipant = Membership::query()
            ->whereIn('group_id', $session->groups()->pluck('id'))
            ->where('status', 'active')
            ->pluck('group_id', 'participant_id');

        $groups = Group::query()
            ->where('group_session_id', $session->id)
            ->get()
            ->keyBy('id');

        $participants = Participant::query()
            ->where('group_session_id', $session->id)
            ->orderBy('name')
            ->get();

        $filename = 'groupify-'.$session->code.'.csv';

        return response()->streamDownload(function () use ($participants, $groupByParticipant, $groups, $fields, $anonymous) {
            $out = fopen('php://output', 'w');

            if ($out === false) {
                throw new \RuntimeException('Could not open the output stream.');
            }

            // CSV-injection guard: cells that look like spreadsheet formulas
            // (=, +, -, @) get a leading apostrophe so Excel/Sheets keep them
            // as text instead of evaluating them.
            $cell = fn (string $value): string => $value === ''
                ? ''
                : (preg_match('/^[=+@\-]/', $value) ? "'".$value : $value);

            fputcsv($out, array_map($cell, ['group', 'name', ...($anonymous ? ['registered name'] : []), 'email', ...$fields->all()]));

            foreach ($participants as $p) {
                $groupId = $groupByParticipant->get($p->id);
                $group = $groupId !== null ? $groups->get($groupId) : null;
                /** @var array<string, string> $values */
                $values = $group !== null ? $group->field_values : [];
                $row = [
                    $group !== null ? $group->name : '(pool)',
                    $p->display_name ?? $p->name,
                    $p->email ?? '',
                ];
                if ($anonymous) {
                    array_splice($row, 2, 0, [$p->name]);
                }
                foreach ($fields as $field) {
                    $row[] = $values[$field] ?? '';
                }
                fputcsv($out, array_map($cell, $row));
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
