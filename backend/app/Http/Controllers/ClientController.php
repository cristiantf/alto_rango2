<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientController extends Controller
{
    public function index()
    {
        try {
            $clients = DB::table('clients')->orderBy('id')->get();
            return response()->json($clients);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function show($id)
    {
        try {
            $client = DB::table('clients')->where('id', $id)->first();
            if (!$client) {
                return response()->json(['error' => 'Cliente no encontrado'], 404);
            }
            return response()->json($client);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $tenant_id = $request->input('tenant_id', 1);
        $name = $request->input('name');
        $email = $request->input('email');
        $phone = $request->input('phone');
        $status = $request->input('status', 'active');
        $plan = $request->input('plan');
        $plan_end = $request->input('plan_end');
        $photo = $request->input('photo', '👤');
        $weight = $request->input('weight');
        $height = $request->input('height');
        $bmi = $request->input('bmi');
        $join_date = $request->input('join_date', date('Y-m-d'));
        $visits = $request->input('visits', 0);
        $visits_remaining = $request->input('visits_remaining');
        $direct_access = $request->input('direct_access', false) ? 1 : 0;
        $password = $request->input('password');
        $facial_access = $request->input('facial_access', true) ? 1 : 0;
        $face_descriptor = $request->input('face_descriptor');

        try {
            DB::beginTransaction();

            $insertId = DB::table('clients')->insertGetId([
                'tenant_id' => $tenant_id,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'status' => $status,
                'plan' => $plan,
                'plan_end' => $plan_end,
                'photo' => $photo,
                'weight' => $weight,
                'height' => $height,
                'bmi' => $bmi,
                'join_date' => $join_date,
                'visits' => $visits,
                'visits_remaining' => $visits_remaining,
                'direct_access' => $direct_access,
                'password' => $password ?: null,
                'facial_access' => $facial_access,
                'face_descriptor' => $face_descriptor
            ]);

            if ($password) {
                $userExists = DB::table('users')->where('email', $email)->exists();
                if ($userExists) {
                    DB::table('users')->where('email', $email)->update([
                        'password' => $password,
                        'name' => $name
                    ]);
                } else {
                    DB::table('users')->insert([
                        'tenant_id' => $tenant_id,
                        'role_id' => 3,
                        'name' => $name,
                        'email' => $email,
                        'password' => $password
                    ]);
                }
            }

            DB::commit();
            return response()->json(array_merge(['id' => $insertId], $request->all()), 201);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $allowed = [
            'name', 'email', 'phone', 'status', 'plan', 'plan_end', 'photo',
            'weight', 'height', 'bmi', 'visits', 'visits_remaining', 'direct_access', 
            'password', 'facial_access', 'face_descriptor'
        ];

        $data = [];
        foreach ($allowed as $key) {
            if ($request->has($key) && $request->input($key) !== '') {
                $val = $request->input($key);
                if (in_array($key, ['direct_access', 'facial_access'])) {
                    $val = $val ? 1 : 0;
                }
                $data[$key] = $val;
            }
        }

        if (empty($data)) {
            return response()->json(['error' => 'Nada que actualizar'], 400);
        }

        try {
            DB::beginTransaction();

            DB::table('clients')->where('id', $id)->update($data);

            if (isset($data['password']) && isset($data['email'])) {
                $userExists = DB::table('users')->where('email', $data['email'])->exists();
                if ($userExists) {
                    DB::table('users')->where('email', $data['email'])->update([
                        'password' => $data['password']
                    ]);
                } else {
                    DB::table('users')->insert([
                        'tenant_id' => 1,
                        'role_id' => 3,
                        'name' => $data['name'] ?? 'Cliente',
                        'email' => $data['email'],
                        'password' => $data['password']
                    ]);
                }
            }

            DB::commit();
            return response()->json(['ok' => true]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            DB::table('clients')->where('id', $id)->delete();
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }
}
