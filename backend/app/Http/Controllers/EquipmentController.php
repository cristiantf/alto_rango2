<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EquipmentController extends Controller
{
    private const FIELDS = ['name', 'type', 'quantity', 'location', 'notes', 'status', 'description', 'purchase_date'];

    public function index(Request $request)
    {
        try {
            $equipment = $this->forTenant(DB::table('equipment'), $request)->orderBy('id')->get();
            return response()->json($equipment);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'quantity' => 'nullable|integer|min:0',
        ]);

        try {
            $data = $request->only(self::FIELDS);
            $data['tenant_id'] = $this->tenantId($request) ?? 1;
            $id = DB::table('equipment')->insertGetId($data);
            return response()->json(DB::table('equipment')->where('id', $id)->first(), 201);
        } catch (\Exception $e) {
            report($e);
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $data = $request->only(self::FIELDS);
        if (empty($data)) {
            return response()->json(['error' => 'Nada que actualizar'], 400);
        }

        try {
            DB::table('equipment')->where('id', $id)->update($data);
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            report($e);
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            DB::table('equipment')->where('id', $id)->delete();
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }
}
