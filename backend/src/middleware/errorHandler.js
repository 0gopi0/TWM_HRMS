import { isProd } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

export function notFound(_req, _res, next) {
  next(new HttpError(404, "Not found"));
}

export function errorHandler(err, req, res, _next) {
  const status = err.status && Number.isInteger(err.status) ? err.status : 500;
  const payload = {
    error: status === 500 && isProd ? "Internal server error" : err.message,
    requestId: req.requestId,
  };
  if (err.details) payload.details = err.details;
  if (!isProd && status === 500) payload.stack = err.stack;
  if (status >= 500) {
    console.error(JSON.stringify({ level: "error", requestId: req.requestId, err: err.message, stack: err.stack }));
  }
  res.status(status).json(payload);
}
