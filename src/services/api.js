// Cliente HTTP único para la API de Laravel (antes duplicado en auth.js y gym.js)
export const API = import.meta.env.VITE_API_URL || 'https://altorangogym.com/api'

// Gimnasio del usuario en sesión: la API filtra los datos con la cabecera X-Tenant-Id
function currentTenantId() {
  try {
    return JSON.parse(localStorage.getItem('gym_user') || 'null')?.tenant_id ?? null
  } catch {
    return null
  }
}

export function apiHeaders() {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const tenant = currentTenantId()
  if (tenant != null) headers['X-Tenant-Id'] = String(tenant)
  return headers
}

// fetch con cabeceras comunes; devuelve la Response tal cual
export function apiFetch(path, opts = {}) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: { ...apiHeaders(), ...(opts.headers || {}) },
  })
}

// fetch + JSON; lanza Error con el mensaje de la API si la respuesta no es 2xx
export async function api(path, opts = {}) {
  const res = await apiFetch(path, {
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || err.message || res.statusText)
  }
  return res.json()
}
