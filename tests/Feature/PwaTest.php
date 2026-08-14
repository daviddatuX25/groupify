<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('ships the web app manifest with install metadata', function () {
    $manifest = json_decode(file_get_contents(public_path('manifest.webmanifest')), true, 512, JSON_THROW_ON_ERROR);

    expect($manifest['name'])->toBe('Groupify')
        ->and($manifest['display'])->toBe('standalone')
        ->and($manifest['theme_color'])->toBe('#0f172a')
        ->and($manifest['icons'])->not->toBeEmpty();
});

it('ships the service worker with the offline shell', function () {
    $sw = file_get_contents(public_path('sw.js'));

    expect($sw)->toContain('self.addEventListener(\'fetch\'')
        ->and($sw)->toContain("'/'");
});

it('ships install icons at both required sizes', function () {
    expect(public_path('icons/icon-192.png'))->toBeFile()
        ->and(public_path('icons/icon-512.png'))->toBeFile();
});

it('links the manifest from the app shell', function () {
    $this->get('/')->assertOk()->assertSee('rel="manifest" href="/manifest.webmanifest"', false);
});
