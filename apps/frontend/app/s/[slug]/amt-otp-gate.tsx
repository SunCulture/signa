"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ShieldCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/http";
import type { SigningGatedForm } from "@/lib/api/signing";
import {
  storeAmtOtpGateToken,
  verifySigningAmtOtp,
} from "@/lib/api/signing-gate";

const CODE_LENGTH = 6;
const CODE_SLOTS = Array.from({ length: CODE_LENGTH }, (_, index) => index);

export function AmtOtpGate({
  form,
  onVerified,
}: {
  form: SigningGatedForm;
  onVerified: () => void;
}) {
  const gate = useAmtOtpVerification(form.submitter.slug, onVerified);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void gate.verify(gate.code);
  }

  return (
    <main
      className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] px-6 text-[var(--auth-foreground)]"
      id="main-content"
      tabIndex={-1}
    >
      <form
        className="flex w-full max-w-md flex-col items-center gap-5 text-center"
        onSubmit={submit}
      >
        <Image
          alt="Signa"
          className="h-14 w-auto object-contain"
          height={72}
          priority
          src="/images/logo.png"
          width={124}
        />
        <ShieldCheckIcon className="size-10 text-[var(--auth-primary)]" />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Enter your access code</h1>
          <p className="text-sm text-[var(--auth-muted-foreground)]">
            {getGateIntro(form)}
          </p>
        </div>
        <AmtOtpCodeInput
          code={gate.code}
          error={gate.error}
          isVerifying={gate.isVerifying}
          onChange={gate.changeCode}
          onComplete={(value) => void gate.verify(value)}
        />
        <Button
          className="h-12 w-full rounded-full bg-[var(--auth-primary)] text-sm font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
          disabled={gate.code.length !== CODE_LENGTH || gate.isVerifying}
          type="submit"
        >
          {gate.isVerifying ? <Spinner className="size-4" /> : null}
          CONTINUE
        </Button>
        <p className="text-sm text-[var(--auth-muted-foreground)]">
          Didn&apos;t get a code? Ask the person who sent you this document to
          send a new one.
        </p>
      </form>
    </main>
  );
}

function AmtOtpCodeInput({
  code,
  error,
  isVerifying,
  onChange,
  onComplete,
}: {
  code: string;
  error: string | null;
  isVerifying: boolean;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
}) {
  return (
    <>
      <InputOTP
        aria-describedby={error ? "amt-otp-gate-error" : undefined}
        aria-invalid={Boolean(error)}
        aria-label="6-digit access code"
        autoComplete="one-time-code"
        autoFocus
        containerClassName="justify-center"
        disabled={isVerifying}
        inputMode="numeric"
        maxLength={CODE_LENGTH}
        onChange={onChange}
        onComplete={onComplete}
        pattern={REGEXP_ONLY_DIGITS}
        value={code}
      >
        <InputOTPGroup>
          {CODE_SLOTS.map((index) => (
            <InputOTPSlot
              aria-invalid={Boolean(error)}
              className="size-12 bg-white text-xl font-semibold"
              index={index}
              key={index}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {error ? (
        <p
          className="text-sm font-semibold text-destructive"
          id="amt-otp-gate-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </>
  );
}

function useAmtOtpVerification(slug: string, onVerified: () => void) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  function changeCode(value: string) {
    setCode(value);
    setError(null);
  }

  async function verify(candidate: string) {
    if (candidate.length !== CODE_LENGTH || isVerifying) {
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { gate_token } = await verifySigningAmtOtp(slug, candidate);

      storeAmtOtpGateToken(slug, gate_token);
      onVerified();
    } catch (verifyError) {
      setCode("");
      setError(getGateErrorMessage(verifyError));
    } finally {
      setIsVerifying(false);
    }
  }

  return { changeCode, code, error, isVerifying, verify };
}

function getGateIntro(form: SigningGatedForm): string {
  const document = form.template.name
    ? `“${form.template.name}”`
    : "this document";

  return `We sent you a 6-digit code with your signing link. Enter it to open ${document}.`;
}

function getGateErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return "Too many attempts. Wait a minute and try again.";
  }

  if (error instanceof ApiError && error.status === 503) {
    return error.message;
  }

  return "That code is not valid or has expired";
}
