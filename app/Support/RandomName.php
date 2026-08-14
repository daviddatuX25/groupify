<?php

namespace App\Support;

/**
 * Anonymous-mode display names (Blooket/Slido pattern): adjective + animal.
 * The real name stays host-side only.
 */
final class RandomName
{
    private const ADJECTIVES = ['Swift', 'Bold', 'Quiet', 'Bright', 'Clever', 'Mellow', 'Witty', 'Cosmic', 'Gentle', 'Fierce', 'Lucky', 'Nimble', 'Rapid', 'Shady', 'Sunny'];

    private const ANIMALS = ['Fox', 'Panda', 'Owl', 'Wolf', 'Falcon', 'Otter', 'Coyote', 'Heron', 'Badger', 'Lynx', 'Moose', 'Raccoon', 'Sparrow', 'Tiger', 'Whale'];

    public static function generate(): string
    {
        return self::ADJECTIVES[array_rand(self::ADJECTIVES)].' '.self::ANIMALS[array_rand(self::ANIMALS)];
    }
}
