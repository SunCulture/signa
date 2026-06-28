export type TenantContext = {
  accountId: string;
  userId: string;
  accessTokenId: string;
  role: string;
  teamId?: string;
  apiTokenPermissions?: string[];
};
