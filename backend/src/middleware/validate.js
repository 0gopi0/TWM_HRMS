import { z } from "zod";
import { HttpError } from "../utils/httpError.js";

export function validate({ body, query, params }) {
  return (req, _res, next) => {
    try {
      if (body) req.body = body.parse(req.body);
      // Express 5 exposes req.query as a getter-only accessor, so a plain
      // assignment throws — redefine it as a normal writable property instead.
      if (query) {
        const parsed = query.parse(req.query);
        Object.defineProperty(req, "query", { value: parsed, writable: true, configurable: true });
      }
      if (params) req.params = params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new HttpError(422, "Validation failed", err.flatten()));
        return;
      }
      next(err);
    }
  };
}
