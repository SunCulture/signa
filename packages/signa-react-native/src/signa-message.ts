import type {
  SignaErrorPayload,
  SignaLoadPayload,
  SignaNativeMessage,
  SignaSubmitterPayload,
} from "./signa-events";

export type SignaMessageHandlers = {
  onLoad?: (payload: SignaLoadPayload) => void;
  onComplete?: (payload: SignaSubmitterPayload) => void;
  onDecline?: (payload: SignaSubmitterPayload) => void;
  onError?: (payload: SignaErrorPayload) => void;
  onMessage?: (message: SignaNativeMessage) => void;
};

export function dispatchSignaMessage(
  rawData: string,
  handlers: SignaMessageHandlers,
): void {
  const message = parseSignaMessage(rawData);

  if (!message) {
    return;
  }

  handlers.onMessage?.(message);

  if (message.type === "signa:loaded") {
    handlers.onLoad?.(message.payload as SignaLoadPayload);
    return;
  }

  if (message.type === "signa:completed") {
    handlers.onComplete?.(message.payload as SignaSubmitterPayload);
    return;
  }

  if (message.type === "signa:declined") {
    handlers.onDecline?.(message.payload as SignaSubmitterPayload);
    return;
  }

  if (message.type === "signa:error") {
    handlers.onError?.(normalizeErrorPayload(message.payload));
  }
}

function parseSignaMessage(rawData: string): SignaNativeMessage | null {
  try {
    const parsed = JSON.parse(rawData) as SignaNativeMessage;

    return isSignaMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isSignaMessage(value: SignaNativeMessage): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.type === "string" &&
    value.type.startsWith("signa:")
  );
}

function normalizeErrorPayload(payload: unknown): SignaErrorPayload {
  if (isErrorPayload(payload)) {
    return payload;
  }

  return {
    message: "The embedded Signa signing flow reported an unknown error.",
    details: payload,
  };
}

function isErrorPayload(value: unknown): value is SignaErrorPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  );
}
