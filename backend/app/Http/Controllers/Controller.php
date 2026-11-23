<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Gimnasio (tenant) de la petición: cabecera X-Tenant-Id que envía el frontend
     * o, en su defecto, el campo tenant_id del cuerpo / query string.
     *
     * Nota: mientras la API no tenga autenticación este valor lo decide el cliente,
     * así que separa los datos de cada gimnasio pero no es un control de seguridad.
     */
    protected function tenantId(Request $request): ?int
    {
        $value = $request->header('X-Tenant-Id', $request->input('tenant_id'));
        return is_numeric($value) ? (int) $value : null;
    }

    /** Aplica el filtro por gimnasio a una consulta si la petición indica uno. */
    protected function forTenant($query, Request $request, string $column = 'tenant_id')
    {
        $tenant = $this->tenantId($request);
        return $tenant ? $query->where($column, $tenant) : $query;
    }
}
