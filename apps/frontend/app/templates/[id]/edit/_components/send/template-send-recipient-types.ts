export type SendRecipientTab = "email" | "phone" | "detailed" | "upload";

export type TemplateSendRole = {
  id: string;
  name: string;
};

export type RecipientContact = {
  email: string;
  name: string;
  phone: string;
};

export type RecipientSet = {
  id: string;
  contacts: Record<string, RecipientContact>;
};

export type BulkRecipientRow = Record<string, string | undefined>;
