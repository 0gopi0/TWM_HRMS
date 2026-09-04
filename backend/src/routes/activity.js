import { Router } from "express";
import { z } from "zod";
import { PERMISSIONS } from "@twm/shared";
import { authenticate, attachEmployee } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import * as activityLogService from "../services/activityLogService.js";
import { parsePagination, paginated } from "../utils/pagination.js";

export const activityRouter = Router();
activityRouter.use(authenticate, attachEmployee);

const ymd = /^\d{4}-\d{2}-\d{2}$/;

activityRouter.get(
  "/",
  authorize(PERMISSIONS.AUDIT_READ_COMPANY),
  validate({
    query: z.object({
      actorEmployeeId: z.string().min(1).optional(),
      targetEmployeeId: z.string().min(1).optional(),
      category: z.enum(activityLogService.ACTIVITY_CATEGORIES).optional(),
      from: z.string().regex(ymd).optional(),
      to: z.string().regex(ymd).optional(),
      page: z.coerce.number().int().optional(),
      pageSize: z.coerce.number().int().optional(),
    }),
  }),
  async (req, res, next) => {
    try {
      const { page, pageSize } = parsePagination(req.query);
      const { items, total } = await activityLogService.listActivity({
        actorEmployeeId: req.query.actorEmployeeId,
        targetEmployeeId: req.query.targetEmployeeId,
        category: req.query.category,
        from: req.query.from,
        to: req.query.to,
        page,
        pageSize,
      });
      res.json(paginated(items, total, { page, pageSize }));
    } catch (err) {
      next(err);
    }
  },
);
