<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    // Roles map matching Node.js prototype
    private const ROLE_LABELS = [
        1 => 'Administrador',
        2 => 'Staff',
        3 => 'Cliente'
    ];

    public function login(Request $request)
    {
        $email = $request->input('email');
        $password = $request->input('password');

        if (!$email || !$password) {
            return response()->json(['error' => 'Email y contraseña requeridos'], 400);
        }

        // Simulating the raw query from Node.js MVP
        $email = strtolower(trim($email));

        $user = DB::table('users as u')
            ->select(
                'u.id', 'u.tenant_id', 'u.role_id', 'u.name', 'u.email', 'u.profile_image_url',
                'u.role_id as role', 
                'g.name as gym_name'
            )
            ->leftJoin('gyms as g', 'g.id', '=', 'u.tenant_id')
            ->whereRaw('LOWER(TRIM(u.email)) = ?', [$email])
            ->where('u.password', $password)
            ->where(function ($query) {
                $query->where('u.status', 'active')
                      ->orWhereNull('u.status');
            })
            ->first();

        if (!$user) {
            return response()->json(['error' => 'Credenciales incorrectas'], 401);
        }

        // Update last login silently
        try {
            DB::table('users')->where('id', $user->id)->update(['last_login' => now()]);
        } catch (\Exception $e) {
            // last_login might not exist, ignore as in prototype
        }

        // Get initials for avatar
        $nameParts = explode(' ', $user->name ?: 'U');
        $avatar = substr(strtoupper($nameParts[0][0] ?? '') . strtoupper($nameParts[1][0] ?? ''), 0, 2);

        return response()->json([
            'id'        => $user->id,
            'tenant_id' => $user->tenant_id,
            'role_id'   => $user->role_id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role,
            'position'  => self::ROLE_LABELS[$user->role] ?? $user->role,
            'photoUrl'  => $user->profile_image_url ?: null,
            'avatar'    => $avatar ?: 'U',
            'gym'       => $user->gym_name ? ['id' => $user->tenant_id, 'name' => $user->gym_name] : null,
        ]);
    }

    public function register(Request $request)
    {
        $tenant_id = $request->input('tenant_id');
        $name = $request->input('name');
        $email = $request->input('email');
        $password = $request->input('password');

        if (!$tenant_id || !$name || !$email || !$password) {
            return response()->json(['error' => 'Faltan campos obligatorios'], 400);
        }

        $existing = DB::table('users')->where('email', $email)->exists();
        if ($existing) {
            return response()->json(['error' => 'El email ya está registrado'], 400);
        }

        try {
            DB::beginTransaction();

            $userId = DB::table('users')->insertGetId([
                'tenant_id' => $tenant_id,
                'role_id'   => 3, // Cliente
                'name'      => $name,
                'email'     => $email,
                'password'  => $password, // Prototype uses plain text
                'status'    => 'active'
            ]);

            DB::table('clients')->insert([
                'tenant_id' => $tenant_id,
                'name'      => $name,
                'email'     => $email
            ]);

            DB::commit();

            return response()->json([
                'success' => true, 
                'message' => 'Usuario registrado exitosamente', 
                'userId'  => $userId
            ], 201);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error interno del servidor'], 500);
        }
    }
}
