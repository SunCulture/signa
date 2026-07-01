export type PreferencesFormState = {
  bccCompleted: string;
  completedMessageBody: string;
  completedRedirectUrl: string;
  completedNotificationEmailAttachAudit: boolean;
  completedNotificationEmailAttachDocuments: boolean;
  completedNotificationEmailBody: string;
  completedNotificationEmailEnabled: boolean;
  completedNotificationEmailSubject: string;
  defaultExpireAt: string;
  defaultExpireAtDuration: string;
  documentsCopyEmailAttachAudit: boolean;
  documentsCopyEmailAttachDocuments: boolean;
  documentsCopyEmailBody: string;
  documentsCopyEmailEnabled: boolean;
  documentsCopyEmailReplyTo: string;
  documentsCopyEmailSubject: string;
  linkFormFields: string[];
  ownerAutoSignMode: "inherit" | "enabled" | "disabled";
  ownerAutoSignRole: string;
  ownerAutoSignSendEmail: boolean;
  requestEmailBody: string;
  requestEmailEnabled: boolean;
  requestEmailSubject: string;
  requireEmailTwoFactor: boolean;
  requirePhoneTwoFactor: boolean;
};

export const defaultExpirationOptions = [
  { label: "None", value: "none" },
  { label: "1 day", value: "one_day" },
  { label: "2 days", value: "two_days" },
  { label: "3 days", value: "three_days" },
  { label: "4 days", value: "four_days" },
  { label: "5 days", value: "five_days" },
  { label: "6 days", value: "six_days" },
  { label: "7 days", value: "seven_days" },
  { label: "8 days", value: "eight_days" },
  { label: "9 days", value: "nine_days" },
  { label: "10 days", value: "ten_days" },
  { label: "2 weeks", value: "two_weeks" },
  { label: "3 weeks", value: "three_weeks" },
  { label: "4 weeks", value: "four_weeks" },
  { label: "1 month", value: "one_month" },
  { label: "2 months", value: "two_months" },
  { label: "3 months", value: "three_months" },
  { label: "Specified date", value: "specified_date" },
];

export const linkFormFieldOptions = [
  { label: "Email", value: "email" },
  { label: "Name", value: "name" },
  { label: "Phone", value: "phone" },
];
