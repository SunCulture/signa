export const signaRoles = [
  'admin',
  'editor',
  'member',
  'viewer',
  'agent',
] as const;

export type SignaRole = (typeof signaRoles)[number];

export function isSignaRole(role: unknown): role is SignaRole {
  return typeof role === 'string' && signaRoles.includes(role as SignaRole);
}
