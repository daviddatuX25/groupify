<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('serves a health heartbeat', function () {
    $this->getJson('/health')
        ->assertOk()
        ->assertJson(['status' => 'ok']);
});
