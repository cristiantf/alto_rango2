<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    private const ROLE_LABELS = [
        1 => 'Administrador',
        2 => 'Empleado',
        3 => 'Cliente',
        'administrador' => 1,
        'empleado' => 2,
        'cliente' => 3
    ];

    public function index()
    {
        try {
            $rows = DB::table('users as u')
                ->select('id', 'tenant_id', 'role_id', 'name', 'email', 'profile_image_url', 'status', 'last_login', 'created_at')
                ->orderBy('id')
                ->get();

            $users = $rows->map(function ($u) {
                $nameParts = explode(' ', $u->name ?: 'U');
                $avatar = substr(strtoupper($nameParts[0][0] ?? '') . strtoupper($nameParts[1][0] ?? ''), 0, 2);
                
                return [
                    'id' => $u->id,
                    'tenant_id' => $u->tenant_id,
                    'role_id' => $u->role_id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'status' => $u->status,
                    'avatar' => $avatar ?: 'U',
                    'photoUrl' => $u->profile_image_url ?: null,
                    'lastLogin' => $u->last_login ?: 'Nunca',
                    'createdAt' => $u->created_at ? substr($u->created_at, 0, 10) : $u->created_at,
                    'position' => self::ROLE_LABELS[$u->role_id] ?? $u->role_id,
                ];
            });

            return response()->json($users);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $tenant_id = $request->input('tenant_id', 1);
        $name = $request->input('name');
        $email = $request->input('email');
        $password = $request->input('password', 'cambiar123');
        $role = $request->input('role', 'empleado');
        $status = $request->input('status', 'active');
        
        $roleId = self::ROLE_LABELS[$role] ?? 3;

        try {
            $insertId = DB::table('users')->insertGetId([
                'tenant_id' => $tenant_id,
                'role_id' => $roleId,
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'status' => $status,
            ]);

            return response()->json([
                'id' => $insertId,
                'name' => $name,
                'email' => $email,
                'role' => $role,
                'status' => $status
            ], 201);
        } catch (\Exception $e) {
            // Check for duplicate entry (simplistic check for duplicate email)
            if (strpos($e->getMessage(), 'Duplicate entry') !== false || strpos($e->getMessage(), 'Integrity constraint violation') !== false) {
                return response()->json(['error' => 'Email ya registrado'], 409);
            }
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $data = [];
        if ($request->has('name')) $data['name'] = $request->input('name');
        if ($request->has('email')) $data['email'] = $request->input('email');
        if ($request->has('role')) $data['role_id'] = self::ROLE_LABELS[$request->input('role')] ?? 3;
        if ($request->has('status')) $data['status'] = $request->input('status');
        if ($request->has('password')) $data['password'] = $request->input('password');
        if ($request->has('photoUrl')) $data['profile_image_url'] = $request->input('photoUrl');

        if (empty($data)) {
            return response()->json(['error' => 'Nada que actualizar'], 400);
        }

        try {
            DB::table('users')->where('id', $id)->update($data);
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            DB::table('users')->where('id', $id)->delete();
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }
}
