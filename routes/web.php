<?php

use App\Http\Controllers\Admin\AdminPanelController;
use App\Http\Controllers\Admin\SessionConfigController;
use App\Http\Controllers\SessionController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Session lifecycle (FR-1.1): create page + store; creator lands in the admin panel
Route::get('/new', [SessionController::class, 'new'])->name('sessions.new');
Route::post('/sessions', [SessionController::class, 'store'])->name('sessions.store');

// Admin-only (AD-3: token in query or X-Admin-Token header)
Route::get('/admin/sessions/{session}', [AdminPanelController::class, 'show'])->name('admin.sessions.show');
Route::put('/admin/sessions/{session}/config', [SessionConfigController::class, 'update'])
    ->name('admin.sessions.config.update');
