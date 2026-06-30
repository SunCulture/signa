export type WebSession = {
  accountId: string;
  isTestMode?: boolean;
  teamId?: string;
  trueAccountId?: string;
  trueUserId?: string;
  userId: string;
  role: string;
};

export type WebSessionJwtPayload = WebSession & {
  sub: string;
};
