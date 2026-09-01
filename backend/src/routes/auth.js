import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import * as auth from "../services/authService.js";
import { authenticate } from "../middleware/authenticate.js";
import { getStore } from "../store/index.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

authRouter.post(
  "/login",
  loginLimiter,
  validate({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(8).max(128),
    }),
  }),
  async (req, res, next) => {
    try {
      const session = await auth.login(req.body.email, req.body.password);
      res.cookie("refresh_token", session.refreshToken, auth.refreshCookieOptions());
      res.json({
        accessToken: session.accessToken,
        expiresIn: session.expiresIn,
        user: session.user,
      });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const session = await auth.refresh(req.cookies.refresh_token);
    res.cookie("refresh_token", session.refreshToken, auth.refreshCookieOptions());
    res.json({
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      user: session.user,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    await auth.logout(req.cookies.refresh_token);
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const store = getStore();
    const user = await store.findUserById(req.user.id);
    const employee = await store.getEmployeeByUserId(req.user.id);
    res.json({ user: auth.publicUser(user, employee) });
  } catch (err) {
    next(err);
  }
});
