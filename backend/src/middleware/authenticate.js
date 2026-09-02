import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getStore } from "../store/index.js";
import { HttpError } from "../utils/httpError.js";

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.cookies?.access_token;
  if (!token) {
    next(new HttpError(401, "Authentication required"));
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export async function attachEmployee(req, _res, next) {
  try {
    const employee = await getStore().getEmployeeByUserId(req.user.id);
    req.employee = employee;
    next();
  } catch (err) {
    next(err);
  }
}
