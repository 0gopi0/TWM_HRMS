import { hasPermission } from "@twm/shared";
import { HttpError } from "../utils/httpError.js";

export function authorize(...permissions) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new HttpError(401, "Authentication required"));
      return;
    }
    const ok = permissions.every((code) => hasPermission(req.user.role, code));
    if (!ok) {
      next(new HttpError(403, "Forbidden"));
      return;
    }
    next();
  };
}
