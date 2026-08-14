<?php

use App\Http\Controllers\Admin\AdminPanelController;
use App\Http\Controllers\Admin\SessionConfigController;
use App\Http\Controllers\Admin\SessionStateController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\JoinController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\SessionPageController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Session lifecycle (FR-1.1): create page + store; creator lands in the admin panel
Route::get('/new', [SessionController::class, 'new'])->name('sessions.new');
Route::post('/sessions', [SessionController::class, 'store'])->name('sessions.store');

// Participant entry (FR-2.1, FR-2.3, FR-2.4): join by code + PIN, seat check, session page
Route::get('/join/{session:code}/seat', [JoinController::class, 'seat'])->name('join.seat');
Route::get('/join/{session:code}', [JoinController::class, 'show'])->name('join.show');
Route::post('/join/{session:code}', [JoinController::class, 'store'])->name('join.store');
Route::get('/s/{session:code}', [SessionPageController::class, 'show'])->name('session.show');

// Participant group mutations (FR-4.1 … FR-4.3): device-token identity, transactional checks (AD-7)
Route::post('/s/{session:code}/groups', [GroupController::class, 'store'])->name('groups.store');
Route::post('/s/{session:code}/groups/{group}/join', [GroupController::class, 'join'])->name('groups.join');
Route::post('/s/{session:code}/groups/{group}/leave', [GroupController::class, 'leave'])->name('groups.leave');

// Admin-only (AD-3: token in query or X-Admin-Token header)
Route::get('/admin/sessions/{session}', [AdminPanelController::class, 'show'])->name('admin.sessions.show');
Route::put('/admin/sessions/{session}/config', [SessionConfigController::class, 'update'])
    ->name('admin.sessions.config.update');
Route::patch('/admin/sessions/{session}/state', [SessionStateController::class, 'update'])
    ->name('admin.sessions.state.update');
Route::delete('/admin/sessions/{session}', [SessionStateController::class, 'destroy'])
    ->name('admin.sessions.destroy');
