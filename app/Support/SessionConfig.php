<?php

namespace App\Support;

use Illuminate\Contracts\Support\Arrayable;
use JsonSerializable;

/**
 * The one validated session config structure (AD-4).
 *
 * Shape: { rules{min_members, max_members, join_mode, allow_user_creation,
 * naming, freeze}, fields[], perms{}, extensions[] }.
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
                'join_mode' => 'open', // open | approval
                'allow_user_creation' => true,
                'naming' => 'alpha', // alpha = Team Alpha/Bravo… | table = Table 1/2…
                'freeze' => false,
                'auto_dissolve_minutes' => null,
                'guest_list' => [],
                'anonymous_mode' => false,
            ],
            'fields' => [],
            'perms' => [],
            'extensions' => [],
        ];
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

    /** @return array<int, string> */
    public function guestList(): array
    {
        return $this->data['rules']['guest_list'] ?? [];
    }

    /** @return array<int, string> */
    public function extensions(): array
    {
        return $this->data['extensions'] ?? [];
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
