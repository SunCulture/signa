export const teamRoles = ['manager', 'member', 'viewer'] as const;

export type TeamRole = (typeof teamRoles)[number];

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === 'string' && teamRoles.includes(value as TeamRole);
}
