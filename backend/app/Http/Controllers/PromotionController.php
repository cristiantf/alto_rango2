<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PromotionController extends Controller
{
    public function index()
    {
        try {
            $promotions = DB::table('promotions')->orderBy('id')->get();
            return response()->json($promotions);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $tenant_id = $request->input('tenant_id', 1);
        $name = $request->input('name');
        $discount_percentage = $request->input('discount_percentage', 0);
        $discount_amount = $request->input('discount_amount', 0);
        $start_date = $request->input('start_date');
        $end_date = $request->input('end_date');
        $is_active = $request->input('is_active', true) ? 1 : 0;

        try {
            $insertId = DB::table('promotions')->insertGetId([
                'tenant_id' => $tenant_id,
                'name' => $name,
                'discount_percentage' => $discount_percentage,
                'discount_amount' => $discount_amount,
                'start_date' => $start_date ?: null,
                'end_date' => $end_date ?: null,
                'is_active' => $is_active
            ]);

            return response()->json(array_merge(['id' => $insertId], $request->all()), 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $name = $request->input('name');
        $discount_percentage = $request->input('discount_percentage', 0);
        $discount_amount = $request->input('discount_amount', 0);
        $start_date = $request->input('start_date');
        $end_date = $request->input('end_date');
        $is_active = $request->input('is_active') ? 1 : 0;

        try {
            DB::table('promotions')->where('id', $id)->update([
                'name' => $name,
                'discount_percentage' => $discount_percentage,
                'discount_amount' => $discount_amount,
                'start_date' => $start_date ?: null,
                'end_date' => $end_date ?: null,
                'is_active' => $is_active
            ]);
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            DB::table('promotions')->where('id', $id)->delete();
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }
}
