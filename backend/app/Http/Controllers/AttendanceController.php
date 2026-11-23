<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        try {
            // attendance no tiene tenant_id: se filtra por el gimnasio del cliente
            $attendance = $this->forTenant(
                DB::table('attendance as a')->join('clients as c', 'c.id', '=', 'a.client_id')->select('a.*'),
                $request,
                'c.tenant_id'
            )->orderByDesc('a.id')->get();
            return response()->json($attendance);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function store(Request $request)
    {
        $client_id = $request->input('client_id');
        $client_name = $request->input('client_name');
        $date = $request->input('date');
        $checkin = $request->input('checkin');
        $status = $request->input('status', 'pending');

        try {
            $insertId = DB::table('attendance')->insertGetId([
                'client_id' => $client_id,
                'client_name' => $client_name,
                'date' => $date,
                'checkin' => $checkin,
                'status' => $status
            ]);
            // Marca la apertura pendiente para los controladores que consultan /attendance/check-door
            // (respaldo HTTP del ESP8266/ESP32 cuando MQTT no llega).
            $this->markPendingOpen();
            return response()->json(array_merge(['id' => $insertId], $request->all()), 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $status = $request->input('status');

        try {
            DB::table('attendance')->where('id', $id)->update(['status' => $status]);
            return response()->json(['ok' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function checkAccess(Request $request)
    {
        $client_id = $request->input('client_id');

        try {
            $state = DB::table('access_control_state')->orderByDesc('id')->first();
            if ($state && !$state->is_active) {
                return response()->json(['allowed' => true, 'message' => 'Acceso libre temporalmente']);
            }

            $membership = DB::table('memberships as m')
                ->join('plans as p', 'm.plan_id', '=', 'p.id')
                ->join('clients as c', 'm.client_id', '=', 'c.id')
                ->where('m.client_id', $client_id)
                ->whereDate('m.start_date', '<=', now())
                ->whereDate('m.end_date', '>=', now())
                ->select('m.id', 'm.remaining_accesses', 'p.name as plan_name', 'c.name', 'c.email')
                ->first();

            if (!$membership) {
                return response()->json(['allowed' => false, 'message' => 'Membresía vencida o inactiva']);
            }

            if ($membership->remaining_accesses !== null) {
                if ($membership->remaining_accesses <= 0) {
                    return response()->json(['allowed' => false, 'message' => 'Plan de asistencias agotado']);
                }
                DB::table('memberships')->where('id', $membership->id)->decrement('remaining_accesses');
            }

            DB::table('attendance')->insert([
                'client_id' => $client_id,
                'client_name' => $membership->name ?: 'Cliente',
                'date' => now()->toDateString(),
                'checkin' => now()->toTimeString(),
                'status' => 'completed'
            ]);

            $this->markPendingOpen();
            return response()->json(['allowed' => true, 'message' => 'Acceso concedido. Puerta abierta.']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function directOpen(Request $request)
    {
        $admin_id = $request->input('admin_id');
        $this->markPendingOpen();
        return response()->json(['success' => true, 'message' => 'Puerta abierta manualmente']);
    }

    public function getControlState()
    {
        try {
            $state = DB::table('access_control_state')->orderByDesc('id')->first();
            return response()->json(['is_active' => $state ? (bool) $state->is_active : true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function setControlState(Request $request)
    {
        $is_active = $request->input('is_active') ? 1 : 0;
        $tenant_id = $request->input('tenant_id', 1);

        try {
            $state = DB::table('access_control_state')->orderByDesc('id')->first();
            if ($state) {
                DB::table('access_control_state')->where('id', $state->id)->update(['is_active' => $is_active]);
            } else {
                DB::table('access_control_state')->insert(['tenant_id' => $tenant_id, 'is_active' => $is_active]);
            }
            return response()->json(['success' => true, 'is_active' => (bool)$is_active]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Error del servidor'], 500);
        }
    }

    public function checkDoor()
    {
        $state = DB::table('access_control_state')->orderByDesc('id')->first();
        return response()->json(['open' => $state ? (bool) $state->pending_open : false]);
    }

    public function ackDoor()
    {
        DB::table('access_control_state')->whereRaw('1 = 1')->update(['pending_open' => 0]);
        return response()->json(['success' => true]);
    }

    /** Marca una apertura pendiente para el ESP (respaldo HTTP). Crea la fila de estado si no existe. */
    private function markPendingOpen(): void
    {
        if (DB::table('access_control_state')->exists()) {
            DB::table('access_control_state')->update(['pending_open' => 1]);
        } else {
            DB::table('access_control_state')->insert(['tenant_id' => 1, 'is_active' => 1, 'pending_open' => 1]);
        }
    }
}
