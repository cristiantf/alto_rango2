<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\AttendanceController;

use App\Http\Controllers\PromotionController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\RoutineController;

// Rutas de API para Alto Rango SaaS

// 1. Autenticación
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// 2. Usuarios
Route::apiResource('users', UserController::class);

// 3. Clientes
Route::apiResource('clients', ClientController::class);

// 4. Planes
Route::post('/plans/change-membership', [PlanController::class, 'changeMembership']);
Route::apiResource('plans', PlanController::class);

// 5. Productos (Inventario)
Route::apiResource('products', ProductController::class);

// 6. Asistencia y Control de Acceso
Route::post('/attendance/check-access', [AttendanceController::class, 'checkAccess']);
Route::post('/attendance/direct-open', [AttendanceController::class, 'directOpen']);
Route::get('/attendance/check-door', [AttendanceController::class, 'checkDoor']);
Route::get('/attendance/door-opened', [AttendanceController::class, 'ackDoor']);
Route::get('/attendance/control-state', [AttendanceController::class, 'getControlState']);
Route::post('/attendance/control-state', [AttendanceController::class, 'setControlState']);
Route::apiResource('attendance', AttendanceController::class)->except(['show', 'destroy']);

// 7. Promociones
Route::apiResource('promotions', PromotionController::class);

// 8. Pagos y Ventas
Route::apiResource('payments', PaymentController::class)->only(['index', 'store']);
Route::apiResource('sales', SaleController::class)->only(['index', 'store']);

// 9. Rutinas
Route::apiResource('routines', RoutineController::class);

// 10. Equipamiento (del archivo gym.js)
Route::get('/equipment', function () {
    return response()->json(\Illuminate\Support\Facades\DB::table('equipment')->orderBy('id')->get());
});
Route::delete('/equipment/{id}', function ($id) {
    \Illuminate\Support\Facades\DB::table('equipment')->where('id', $id)->delete();
    return response()->json(['ok' => true]);
});
