import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env, isProd } from "../config/env.js";
import { getStore } from "../store/index.js";
import { HttpError } from "../utils/httpError.js";

function signAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TTL_SECONDS,
  });
}

function signRefresh(user, tokenId) {
  return jwt.sign({ sub: user.id, jti: tokenId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TTL_SECONDS,
  });
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: env.REFRESH_TTL_SECONDS * 1000,
  };
}

export async function login(email, password) {
  const store = getStore();
  const user = await store.findUserByEmail(email.trim().toLowerCase());
  if (!user || !user.isActive) throw new HttpError(401, "Invalid email or password");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid email or password");
  await store.touchLogin(user.id);
  return issueSession(user);
}

export async function issueSession(user) {
  const store = getStore();
  const accessToken = signAccess(user);
  const tokenId = randomUUID();
  const refreshToken = signRefresh(user, tokenId);
  const expiresAt = new Date(Date.now() + env.REFRESH_TTL_SECONDS * 1000);
  await store.saveRefreshToken({ userId: user.id, token: refreshToken, expiresAt });
  const employee = await store.getEmployeeByUserId(user.id);
  return {
    accessToken,
    refreshToken,
    expiresIn: env.ACCESS_TTL_SECONDS,
    user: publicUser(user, employee),
  };
}

export function publicUser(user, employee) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    employee: employee
      ? {
          id: employee.id,
          employeeNumber: employee.employeeNumber,
          legalName: employee.legalName,
          jobTitle: employee.jobTitle || null,
        }
      : null,
  };
}

export async function refresh(refreshToken) {
  if (!refreshToken) throw new HttpError(401, "Refresh token missing");
  const store = getStore();
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw new HttpError(401, "Invalid refresh token");
  }
  const row = await store.getRefreshToken(refreshToken);
  if (!row || row.revokedAt || new Date(row.expiresAt) < new Date()) {
    throw new HttpError(401, "Refresh token revoked");
  }
  await store.revokeRefreshToken(refreshToken);
  const user = await store.findUserById(payload.sub);
  if (!user || !user.isActive) throw new HttpError(401, "Account disabled");
  return issueSession(user);
}

export async function logout(refreshToken) {
  if (refreshToken) await getStore().revokeRefreshToken(refreshToken);
}
