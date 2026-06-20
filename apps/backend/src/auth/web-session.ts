export type WebSession = {
  accountId: string;
  userId: string;
  role: string;
};

export type WebSessionJwtPayload = WebSession & {
  sub: string;
};
