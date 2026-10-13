export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code   = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred.';
  // Never expose stack traces or Firebase internals to the client
  console.error('[ChemGuard Error]', status, code, message);
  res.status(status).json({ success: false, error: { code, message, fields: err.fields || [] } });
}

export function makeError(message, status, code, fields) {
  const err = new Error(message);
  err.status = status || 400;
  err.code   = code || 'BAD_REQUEST';
  if (fields) err.fields = fields;
  return err;
}
