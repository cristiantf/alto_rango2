<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function index()
    {
        try {
            $payments = DB::table('payments as p')
                ->select('p.*', 'p.client_name as client')
                ->orderByDesc('p.date')
                ->get();
            return response()->json($payments);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $tenant_id = $request->input('tenant_id', 1);
        $client_id = $request->input('client_id');
        $client_name = $request->input('client_name', 'Cliente');
        $concept = $request->input('concept', 'Cobro general');
        $amount = $request->input('amount');
        $method = $request->input('method');
        $discount = $request->input('discount', 0);
        $promo = $request->input('promo');

        try {
            $insertId = DB::table('payments')->insertGetId([
                'tenant_id' => $tenant_id,
                'client_id' => $client_id ?: null,
                'client_name' => $client_name,
                'concept' => $concept,
                'amount' => $amount,
                'method' => $method,
                'discount' => $discount,
                'promo' => $promo
            ]);

            return response()->json(array_merge(['id' => $insertId], $request->all()), 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }
}
