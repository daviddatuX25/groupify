<?php

use App\Http\Controllers\Admin\AdminPanelController;
use App\Http\Controllers\Admin\SessionConfigController;
use App\Http\Controllers\JoinController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\SessionPageController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Session lifecycle (FR-1.1): create page + store; creator lands in the admin panel
Route::get('/new', [SessionController::class, 'new'])->name('sessions.new');
Route::post('/sessions', [SessionController::class, 'store'])->name('sessions.store');

// Participant entry (FR-2.1, FR-2.3): join by code + PIN, then the session page
Route::get('/join/{session:code}', [JoinController::class, 'show'])->name('join.show');
Route::post('/join/{session:code}', [JoinController::class, 'store'])->name('join.store');
Route::get('/s/{session:code}', [SessionPageController::class, 'show'])->name('session.show');

// Admin-only (AD-3: token in query or X-Admin-Token header)
Route::get('/admin/sessions/{session}', [AdminPanelController::class, 'show'])->name('admin.sessions.show');
Route::put('/admin/sessions/{session}/config', [SessionConfigController::class, 'update'])
    ->name('admin.sessions.config.update');
