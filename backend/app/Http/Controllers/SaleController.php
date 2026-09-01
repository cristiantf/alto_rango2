<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function index()
    {
        try {
            $sales = DB::table('sales as s')
                ->leftJoin('users as u', 's.user_id', '=', 'u.id')
                ->leftJoin('clients as c', 's.client_id', '=', 'c.id')
                ->select('s.*', 'u.name as employee_name', 'c.name as client_name', 'c.email as client_email')
                ->orderByDesc('s.sale_date')
                ->get();

            $items = DB::table('sale_items')->get();

            $result = $sales->map(function ($s) use ($items) {
                $s->items = $items->where('sale_id', $s->id)->values();
                return $s;
            });

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $tenant_id = $request->input('tenant_id', 1);
        $user_id = $request->input('user_id');
        $client_id = $request->input('client_id');
        $total = $request->input('total');
        $items = $request->input('items', []);

        try {
            DB::beginTransaction();

            $saleId = DB::table('sales')->insertGetId([
                'tenant_id' => $tenant_id,
                'user_id' => $user_id ?: null,
                'client_id' => $client_id ?: null,
                'total' => $total,
                // Assuming sale_date has a default value CURRENT_TIMESTAMP in DB
            ]);

            foreach ($items as $item) {
                DB::table('sale_items')->insert([
                    'sale_id' => $saleId,
                    'inventory_id' => $item['inventory_id'] ?? $item['id'] ?? null, // Fallbacks based on frontend schema
                    'quantity' => $item['quantity'] ?? $item['qty'] ?? 1,
                    'price_unit' => $item['price_unit'] ?? $item['price'] ?? 0,
                    // If your DB expects 'name' column based on gym.js:
                    'name' => $item['name'] ?? 'Producto'
                ]);

                // Update stock based on inventory_id or name
                if (isset($item['inventory_id'])) {
                    DB::table('inventory')
                        ->where('id', $item['inventory_id'])
                        ->decrement('stock', $item['quantity'] ?? $item['qty'] ?? 1);
                } elseif (isset($item['name'])) {
                    DB::table('inventory') // prototype used `products` in gym.js but `inventory` in products.js.
                        ->where('name', $item['name'])
                        ->decrement('stock', $item['quantity'] ?? $item['qty'] ?? 1);
                }
            }

            DB::commit();
            return response()->json(['success' => true, 'saleId' => $saleId], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error del servidor: ' . $e->getMessage()], 500);
        }
    }
}
