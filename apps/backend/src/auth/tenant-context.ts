export type TenantContext = {
  accountId: string;
  userId: string;
  accessTokenId: string;
  isTestMode?: boolean;
  productionAccountId?: string | null;
  role: string;
  testingAccountId?: string | null;
  teamId?: string;
  apiTokenPermissions?: string[];
};
