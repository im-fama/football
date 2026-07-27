export function notFound(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.originalUrl} ->`, err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.publicMessage || "Something went wrong on the server.",
  });
}
