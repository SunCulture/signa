export type WebSession = {
  accountId: string;
  teamId?: string;
  userId: string;
  role: string;
};

export type WebSessionJwtPayload = WebSession & {
  sub: string;
};
