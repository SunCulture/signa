export const teamInvitationStatuses = [
  'pending',
  'accepted',
  'revoked',
  'expired',
] as const;

export type TeamInvitationStatus = (typeof teamInvitationStatuses)[number];
