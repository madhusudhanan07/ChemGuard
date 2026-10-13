// Rejects requests that do not come from the configured localhost frontend.
// This is a development-only guard. It is NOT a substitute for authentication.
export function originGuard(req, res, next) {
  const allowed = process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:5173';
  const origins = allowed.split(',').map(o => o.trim());
  const origin  = req.headers.origin || req.headers.referer || '';
  // Allow requests with no origin (e.g. curl from localhost for health checks)
  if (!origin) { next(); return; }
  const ok = origins.some(o => origin.startsWith(o));
  if (!ok) {
    console.warn('[ChemGuard] Blocked request from disallowed origin:', origin);
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN_ORIGIN', message: 'Access from this origin is not permitted in local development mode.' } });
  }
  next();
}
