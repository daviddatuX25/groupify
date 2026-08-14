<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class HealthController
{
    public function index(): JsonResponse
    {
        return response()->json(['status' => 'ok']);
    }
}
