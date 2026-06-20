import { z } from "zod";

export const healthStatusSchema = z.object({
  status: z.enum(["ok", "error", "shutting_down"]),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;

export type ApiResponse<T> = {
  data: T;
  error: string | null;
};
