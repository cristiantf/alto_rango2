<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoutineController extends Controller
{
    public function index(Request $request)
    {
        try {
            $routines = $this->forTenant(DB::table('routines'), $request)->orderBy('id')->get();
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
            // Sin ejercicios en routine_exercises: usar las líneas de la descripción
            $routines = $routines->map(function ($r) {
                if (empty($r->exercises) || count($r->exercises) === 0) {
                    $r->exercises = collect(preg_split('/\r?\n/', (string) $r->description))
                        ->map(fn ($l) => trim($l))
                        ->filter()
                        ->values();
                }
                $r->level = $r->difficulty;
                return $r;
            });
            return response()->json($routines);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $tenant_id = $this->tenantId($request) ?? 1;
        $name = $request->input('name');
        $description = $request->input('description');
        $difficulty = $request->input('difficulty', $request->input('level'));
        $exercises = array_filter(array_map('trim', (array) $request->input('exercises', [])));

        // La tabla no tiene columna de ejercicios: se guardan como líneas de la descripción
        if ($exercises) {
            $description = trim(($description ? $description . "\n" : '') . implode("\n", $exercises));
        }

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
