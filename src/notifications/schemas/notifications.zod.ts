import { z } from "zod";
import { paginationSchema } from "../../common/validation/zod-schema.patterns";

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
  category: z.enum(["ANNOUNCEMENT", "SYSTEM_UPDATE", "STATUS_UPDATE"]),
  title: z.string().trim().min(1).max(180),
  message: z.string().trim().min(1).max(2000),
});

export const notificationQuerySchema = paginationSchema.extend({
  isRead: z.coerce.boolean().optional(),
  category: z.enum(["ANNOUNCEMENT", "SYSTEM_UPDATE", "STATUS_UPDATE"]).optional(),
});

export const markReadSchema = z.object({
  id: z.string().uuid(),
});
