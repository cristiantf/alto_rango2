<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoutineController extends Controller
{
    public function index()
    {
        try {
            $routines = DB::table('routines')->orderBy('id')->get();
            // Prototype in gym.js attaches exercises, let's attempt to fetch if table exists
            try {
                $exercises = DB::table('routine_exercises')->get();
                $routines = $routines->map(function ($r) use ($exercises) {
                    $r->exercises = $exercises->where('routine_id', $r->id)->pluck('description')->values();
                    return $r;
                });
            } catch (\Exception $ex) {
                // Ignore if routine_exercises table doesn't exist
            }
            return response()->json($routines);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $tenant_id = $request->input('tenant_id', 1);
        $name = $request->input('name');
        $description = $request->input('description');
        $difficulty = $request->input('difficulty');

        try {
            $insertId = DB::table('routines')->insertGetId([
                'tenant_id' => $tenant_id,
                'name' => $name,
                'description' => $description,
                'difficulty' => $difficulty
            ]);

            return response()->json(array_merge(['id' => $insertId], $request->all()), 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $name = $request->input('name');
        $description = $request->input('description');
        $difficulty = $request->input('difficulty');

        try {
            DB::table('routines')->where('id', $id)->update([
                'name' => $name,
                'description' => $description,
                'difficulty' => $difficulty
            ]);
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            DB::table('routines')->where('id', $id)->delete();
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }
}
