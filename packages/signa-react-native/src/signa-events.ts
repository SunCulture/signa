export type SignaNativeEventName =
  | "signa:loaded"
  | "signa:otp_required"
  | "signa:completed"
  | "signa:declined"
  | "signa:error";

export type SignaNativeMessage<TPayload = unknown> = {
  type: SignaNativeEventName;
  payload?: TPayload;
};

export type SignaSignerStatus =
  | "completed"
  | "declined"
  | "expired"
  | "pending";

export type SignaLoadPayload = {
  sandbox?: boolean;
  template?: {
    id: number;
    name: string;
    shared_link?: boolean;
  };
  submission?: {
    id: number;
    name: string | null;
  } | null;
  submitter?: {
    id: number;
    email: string | null;
    slug: string;
    name: string | null;
    phone: string | null;
    values?: Record<string, unknown>;
    uuid?: string;
    external_id?: string | null;
  } | null;
};

/**
 * The signer must enter the invitation code they were sent before the form
 * opens. Signa is showing its code screen; `signa:loaded` follows once the
 * code is accepted.
 */
export type SignaOtpRequiredPayload = {
  submitter: {
    slug: string;
    name: string | null;
  };
  template: {
    name: string | null;
  };
};

export type SignaSubmitterPayload = {
  id: number;
  submission_id: number;
  email: string | null;
  phone: string | null;
  name: string | null;
  status: SignaSignerStatus;
  role: string;
  values?: Array<{
    field: string;
    value: unknown;
  }>;
  submission_url?: string;
  template?: {
    id: number;
    name: string;
    external_id: string | null;
  };
  submission?: {
    id: number;
    status: SignaSignerStatus;
    url?: string;
  };
};

export type SignaErrorPayload = {
  code?: string;
  message: string;
  details?: unknown;
};
