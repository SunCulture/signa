import { z } from "zod";

export const healthStatusSchema = z.object({
  status: z.enum(["ok", "error", "shutting_down"]),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;

export type ApiResponse<T> = {
  data: T;
  error: string | null;
};

export const signaRoles = [
  "admin",
  "editor",
  "member",
  "viewer",
  "agent",
] as const;

export type SignaRole = (typeof signaRoles)[number];

export const signaRoleLabels: Record<SignaRole, string> = {
  admin: "Admin",
  editor: "Editor",
  member: "Member",
  viewer: "Viewer",
  agent: "Agent",
};

export function isSignaRole(role: unknown): role is SignaRole {
  return typeof role === "string" && signaRoles.includes(role as SignaRole);
}
