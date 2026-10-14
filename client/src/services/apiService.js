/**
 * ChemGuard API Service
 * Communicates with the local Express backend at VITE_API_URL.
 * Authentication headers will be added in the next phase.
 */
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

async function request(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const json = await res.json().catch(() => ({ success: false, error: { message: 'Invalid server response' } }));
  if (!res.ok || !json.success) {
    const msg = json.error?.message || 'Request failed (' + res.status + ')';
    const err = new Error(msg); err.code = json.error?.code; err.fields = json.error?.fields; err.status = res.status;
    throw err;
  }
  return json.data;
}

export const reagentApi = {
  list:    (params = {}) => request('GET', '/reagents?' + new URLSearchParams(params).toString()),
  get:     (id)          => request('GET', '/reagents/' + id),
  create:  (body)        => request('POST', '/reagents', body),
  update:  (id, body)    => request('PUT', '/reagents/' + id, body),
  archive: (id)          => request('POST', '/reagents/' + id + '/archive'),
  restore: (id)          => request('POST', '/reagents/' + id + '/restore'),
};

export const storageApi = {
  list:      (params = {}) => request('GET', '/storage/locations?' + new URLSearchParams(params).toString()),
  create:    (body)        => request('POST', '/storage/locations', body),
  rename:    (id, name)    => request('PUT', '/storage/locations/' + id, { name }),
  delete:    (id)          => request('DELETE', '/storage/locations/' + id),
  occupants: (id)          => request('GET', '/storage/locations/' + id + '/occupants'),
};

export const dashboardApi = {
  summary: () => request('GET', '/dashboard/summary'),
};

export const healthApi = {
  check: () => request('GET', '/health'),
};

export const compatibilityApi = {
  check: (reagentId, compartmentId) => request('POST', '/compatibility/check', { reagentId, compartmentId }),
};
export const alertsApi = {
  list:     (params = {}) => request('GET', '/alerts?' + new URLSearchParams(params).toString()),
  summary:  ()            => request('GET', '/alerts/summary'),
  get:      (id)          => request('GET', '/alerts/' + id),
  evaluate: ()            => request('POST', '/alerts/evaluate'),
  preview:  ()            => request('GET', '/alerts/preview'),
};

export const auditApi = {
  list: (params = {}) => request('GET', '/audit?' + new URLSearchParams(params).toString()),
};