<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlanController extends Controller
{
    public function index()
    {
        try {
            $plans = DB::table('plans')->orderBy('id')->get();
            $plans = $plans->map(function ($plan) {
                $plan->features = json_decode($plan->features ?: '[]');
                return $plan;
            });
            return response()->json($plans);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $tenant_id = $request->input('tenant_id', 1);
        $name = $request->input('name');
        $duration_days = $request->input('duration_days', 30);
        $price = $request->input('price');
        $features = $request->input('features', []);

        try {
            $insertId = DB::table('plans')->insertGetId([
                'tenant_id' => $tenant_id,
                'name' => $name,
                'duration_days' => $duration_days,
                'price' => $price,
                'features' => json_encode($features)
            ]);

            return response()->json(array_merge(['id' => $insertId], $request->all()), 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $name = $request->input('name');
        $duration_days = $request->input('duration_days');
        $price = $request->input('price');
        $features = $request->input('features', []);

        try {
            DB::table('plans')->where('id', $id)->update([
                'name' => $name,
                'duration_days' => $duration_days,
                'price' => $price,
                'features' => json_encode($features)
            ]);
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            DB::table('plans')->where('id', $id)->delete();
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function changeMembership(Request $request)
    {
        $client_id = $request->input('client_id');
        $new_plan_id = $request->input('new_plan_id');

        if (!$client_id || !$new_plan_id) {
            return response()->json(['error' => 'client_id y new_plan_id son requeridos'], 400);
        }

        try {
            $plan = DB::table('plans')->select('duration_days', 'name')->where('id', $new_plan_id)->first();
            
            if (!$plan) {
                return response()->json(['error' => 'Plan no encontrado'], 404);
            }

            $remaining = null;
            if (stripos($plan->name, 'pospago') !== false) {
                $remaining = 30;
            }

            DB::table('memberships')->where('client_id', $client_id)->update([
                'plan_id' => $new_plan_id,
                'start_date' => now()->toDateString(),
                'end_date' => now()->addDays($plan->duration_days)->toDateString(),
                'remaining_accesses' => $remaining
            ]);

            return response()->json(['ok' => true, 'message' => 'Plan actualizado exitosamente']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error interno del servidor'], 500);
        }
    }
}
