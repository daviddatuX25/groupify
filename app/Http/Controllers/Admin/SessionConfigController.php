<?php

namespace App\Http\Controllers\Admin;

use App\Events\SessionConfigUpdated;
use App\Extensions\ExtensionRegistry;
use App\Models\Session;
use App\Support\SessionConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class SessionConfigController
{
    use AuthorizesAdminToken;

    /** Admin-only config update (AD-3 token auth). Merge + validate + commit + broadcast (AD-1). */
    public function update(Request $request, Session $session): JsonResponse
    {
        $this->authorizeAdmin($session, $request);

        $merged = array_replace_recursive(
            $session->config->toArray(),
            $request->only(['rules', 'fields', 'perms', 'extensions'])
        );

        $validated = Validator::make($merged, self::rules())->validate();

        $registry = app(ExtensionRegistry::class);
        foreach ($validated['extensions'] ?? [] as $extension) {
            if (! in_array($extension, $registry->registered(), true)) {
                throw ValidationException::withMessages(['extensions' => 'Unknown extension: '.$extension]);
            }
        }

        // validate() drops unruled keys — merge back so future settings survive (AC 4).
        $data = array_replace_recursive($merged, $validated);

        $session->update(['config' => $data]);

        $minutes = $data['rules']['auto_dissolve_minutes'] ?? null;
        $session->update(['dissolve_at' => $minutes !== null ? now()->addMinutes((int) $minutes) : null]);

        broadcast(new SessionConfigUpdated($session))->toOthers();

        return response()->json([
            'ok' => true,
            'config' => SessionConfig::fromArray($validated)->toArray(),
        ]);
    }

    /**
     * Full-structure validation. Unknown keys pass through (schema evolution:
     * a future setting is added here without a migration — AD-4, AC 4).
     */
    /**
     * @return array<string, array<int, string>|string>
     */
    public static function rules(): array
    {
        return [
            'rules.min_members' => ['required', 'integer', 'min:1'],
            'rules.max_members' => ['required', 'integer', 'gte:rules.min_members'],
            'rules.join_mode' => ['required', 'in:open,approval'],
            'rules.allow_user_creation' => ['required', 'boolean'],
            'rules.naming' => ['required', 'string', 'max:50'],
            'rules.freeze' => ['required', 'boolean'],
            'rules.auto_dissolve_minutes' => ['nullable', 'integer', 'min:1'],
            'fields' => ['array'],
            'fields.*.name' => ['required_with:fields', 'string', 'max:80'],
            'fields.*.type' => ['required_with:fields', 'in:text'],
            'fields.*.required' => ['sometimes', 'boolean'],
            'fields.*.filled_by' => ['sometimes', 'in:leader,members'],
            'fields.*.on_card' => ['sometimes', 'boolean'],
            'fields.*.in_csv' => ['sometimes', 'boolean'],
            'fields.*.filterable' => ['sometimes', 'boolean'],
            'perms' => ['array'],
            'extensions' => ['array'],
            'extensions.*' => ['string', 'max:60'],
        ];
    }
}
