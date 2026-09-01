import { Router } from "express";
import { z } from "zod";
import { HOLIDAY_KINDS, PERMISSIONS } from "@twm/shared";
import { authenticate, attachEmployee } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../utils/httpError.js";
import * as calendarService from "../services/calendarService.js";

export const calendarRouter = Router();
calendarRouter.use(authenticate, attachEmployee);

calendarRouter.get("/", authorize(PERMISSIONS.LEAVE_READ_SELF), async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;
    res.json(await calendarService.getCalendarMonth(year, month));
  } catch (err) {
    next(err);
  }
});

calendarRouter.post(
  "/holidays",
  authorize(PERMISSIONS.LEAVE_POLICY_WRITE),
  validate({
    body: z.object({
      name: z.string().min(1).max(128),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      kind: z.enum([HOLIDAY_KINDS.FESTIVAL, HOLIDAY_KINDS.OPTIONAL]),
    }),
  }),
  async (req, res, next) => {
    try {
      const created = await calendarService.createHoliday(req.body);
      res.status(201).json({ data: created });
    } catch (err) {
      if (err.code === "DUPLICATE") {
        next(new HttpError(409, err.message));
        return;
      }
      next(err);
    }
  },
);
