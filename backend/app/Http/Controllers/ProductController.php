<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index()
    {
        try {
            $products = DB::table('inventory')->orderBy('id')->get();
            return response()->json($products);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $tenant_id = $request->input('tenant_id', 1);
        $name = $request->input('name');
        $category = $request->input('category');
        $price = $request->input('price');
        $stock = $request->input('stock');
        $is_public = $request->input('is_public', true) ? 1 : 0;

        try {
            $insertId = DB::table('inventory')->insertGetId([
                'tenant_id' => $tenant_id,
                'name' => $name,
                'category' => $category,
                'price' => $price,
                'stock' => $stock,
                'is_public' => $is_public
            ]);

            return response()->json(array_merge(['id' => $insertId], $request->all()), 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $name = $request->input('name');
        $category = $request->input('category');
        $price = $request->input('price');
        $stock = $request->input('stock');
        $is_public = $request->input('is_public') ? 1 : 0;

        try {
            DB::table('inventory')->where('id', $id)->update([
                'name' => $name,
                'category' => $category,
                'price' => $price,
                'stock' => $stock,
                'is_public' => $is_public
            ]);
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            DB::table('inventory')->where('id', $id)->delete();
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }
}
