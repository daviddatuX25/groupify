<?php

namespace App\Support;

use Illuminate\Contracts\Support\Arrayable;
use JsonSerializable;

/**
 * The one validated session config structure (AD-4).
 *
 * Shape: { rules{min_members, max_members, join_mode, allow_user_creation,
 * naming, freeze}, fields[], perms{}, plugins[].
 * Adding a setting = extending defaults + validation schema — never a migration.
 *
 * @implements Arrayable<string, mixed>
 */
class SessionConfig implements Arrayable, JsonSerializable
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(public readonly array $data) {}

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'rules' => [
                'min_members' => 3,
                'max_members' => 6,
                'join_mode' => 'open', // open | approval (group joins)
                'qr_pinless' => true,
                'retention_days' => 30, // 1 | 2 | 30 | 180 | null (manual delete)
                'allow_user_creation' => true,
                'naming' => 'alpha', // alpha = Team Alpha/Bravo… | table = Table 1/2…
                'freeze' => false,
                'auto_dissolve_minutes' => null,
                'guest_list' => [],
                'anonymous_mode' => false,
                'chat_enabled' => true,
                'group_chat_mode' => 'open', // open | leader
                'global_chat_mode' => 'open', // open | muted | moderated
            ],
            'fields' => [],
            'roles' => [],
            'perms' => [],
            // Messaging announcements are available by default; other plugins are opt-in.
            'plugins' => ['announcements'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    /**
     * Merge with replace semantics: associative arrays merge per key, list
     * arrays are replaced wholesale (so guest-list/fields/quiz edits can
     * remove entries — array_replace_recursive merges numeric lists instead).
     *
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $overlay
     * @return array<string, mixed>
     */
    /**
     * What unauthenticated board fetchers may see (CAP-9, AD-4): the rules the
     * participant UI reads, the custom fields, and nothing else. Never exposes
     * perms/roles/quiz/guest-list to the public snapshot.
     *
     * @return array<string, mixed>
     */
    public function publicView(): array
    {
        $rules = $this->data['rules'] ?? [];
        unset($rules['guest_list']);

        return [
            'rules' => $rules,
            'fields' => $this->data['fields'] ?? [],
            'plugins' => $this->data['plugins'] ?? [],
        ];
    }

    /**
     * Merge with replace semantics: associative arrays merge per key, list
     * arrays are replaced wholesale (so guest-list/fields/quiz edits can
     * remove entries — array_replace_recursive merges numeric lists instead).
     *
     * @param  array<string, mixed>  $base
     * @param  array<string, mixed>  $overlay
     * @return array<string, mixed>
     */
    public static function deepMerge(array $base, array $overlay): array
    {
        foreach ($overlay as $key => $value) {
            if (is_array($value) && isset($base[$key]) && is_array($base[$key])
                && ! array_is_list($value) && ! array_is_list($base[$key])) {
                $base[$key] = self::deepMerge($base[$key], $value);
            } else {
                $base[$key] = $value;
            }
        }

        return $base;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(array_replace_recursive(self::defaults(), $data));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return $this->data;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return $this->data['rules'] ?? [];
    }

    /**
     * @return array<int, mixed>
     */
    public function fields(): array
    {
        return $this->data['fields'] ?? [];
    }

    /**
     * @return array<string, mixed>
     */
    public function perms(): array
    {
        return $this->data['perms'] ?? [];
    }

    /** @return array<string, array<int, string>> */
    public function roles(): array
    {
        return $this->data['roles'] ?? [];
    }

    /** Quiz questions defined by the admin (CAP-8).
     *
     * @return array<int, array{q: string, options: array<int, string>, answer: int, points: int}>
     */
    public function quiz(): array
    {
        return $this->data['quiz']['questions'] ?? [];
    }

    /** @return array<int, string> */
    public function plugins(): array
    {
        return $this->data['plugins'] ?? [];
    }

    /** A session-toggled module (plugin-sdk.md). */
    public function hasPlugin(string $name): bool
    {
        return in_array($name, $this->plugins(), true);
    }

    /** @return array<int, string> */
    public function guestList(): array
    {
        return $this->data['rules']['guest_list'] ?? [];
    }

    /**
     * @param  array<string, mixed>  $perms
     */
    public function withPerms(array $perms): self
    {
        $data = $this->data;
        $data['perms'] = $perms;

        return new self($data);
    }

    public function jsonSerialize(): mixed
    {
        return $this->data;
    }
}
