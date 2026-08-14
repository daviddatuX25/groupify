<?php

use App\Http\Controllers\Admin\SessionConfigController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Admin-only session config (AD-3: X-Admin-Token bearer; AD-5 enforcement in controller)
Route::put('/admin/sessions/{session}/config', [SessionConfigController::class, 'update'])
    ->name('admin.sessions.config.update');
