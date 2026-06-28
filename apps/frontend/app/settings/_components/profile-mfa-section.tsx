"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2Icon, InfoIcon, LockIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  disableMfa,
  enableMfa,
  startMfaSetup,
  type MfaSetup,
} from "@/lib/api/auth";
import { cn } from "@/lib/utils";

export function MfaSection({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);

  async function openSetup() {
    setIsSetupOpen(true);

    try {
      setSetup(await startMfaSetup());
    } catch (error) {
      toast.error("2FA setup failed", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      });
    }
  }

  return (
    <MfaProfileSection title="Two-Factor Authentication">
      <p className="flex items-center gap-2 text-base">
        {enabled ? (
          <CheckCircle2Icon className="size-5 text-green-600" />
        ) : (
          <InfoIcon className="size-5 text-amber-600" />
        )}
        {enabled ? "2FA has been configured" : "2FA is not configured"}
      </p>
      <MfaPrimaryButton
        buttonStyle={enabled ? "outline" : "primary"}
        onClick={enabled ? () => setIsDisableOpen(true) : openSetup}
        type="button"
      >
        <LockIcon className="size-4" />
        {enabled ? "REMOVE 2FA" : "SET UP 2FA"}
      </MfaPrimaryButton>
      <MfaSetupDialog
        onEnabled={() => onChange(true)}
        onOpenChange={setIsSetupOpen}
        open={isSetupOpen}
        setup={setup}
      />
      <MfaDisableDialog
        onDisabled={() => onChange(false)}
        onOpenChange={setIsDisableOpen}
        open={isDisableOpen}
      />
    </MfaProfileSection>
  );
}

function MfaSetupDialog({
  onEnabled,
  onOpenChange,
  open,
  setup,
}: {
  onEnabled: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  setup: MfaSetup | null;
}) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, 6));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await enableMfa(code);
      toast.success("2FA has been configured");
      onEnabled();
      onOpenChange(false);
      setCode("");
    } catch (error) {
      toast.error("2FA code is invalid", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[1.375rem] border-0 bg-[var(--auth-background)] p-0 shadow-2xl sm:max-w-[32rem]">
        <DialogHeader>
          <DialogTitle className="border-b border-[var(--auth-border)] px-6 py-4 text-left text-base font-bold tracking-normal">
            Setup 2FA
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-5 px-6 pb-6 pt-3"
          onSubmit={handleSubmit}
        >
          <p className="mx-auto max-w-[26rem] text-center text-base leading-6 text-[var(--auth-label)]">
            Use an authenticator mobile app like Google Authenticator or
            1Password to scan the QR code below.
          </p>
          {setup ? (
            <>
              <QrCode size={320} value={setup.provisioning_uri} />
              <div className="rounded-2xl bg-[var(--auth-muted)] px-4 py-3 text-center text-xs text-[var(--auth-label)]">
                <span className="font-semibold text-[var(--auth-foreground)]">
                  Setup code:
                </span>{" "}
                <code className="break-all font-mono">{setup.secret}</code>
              </div>
            </>
          ) : (
            <div className="mx-auto flex size-80 items-center justify-center rounded-sm bg-white text-sm text-muted-foreground">
              Generating QR code...
            </div>
          )}
          <Input
            autoComplete="one-time-code"
            className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5 text-center text-base tracking-[0.12em] placeholder:tracking-normal"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => handleCodeChange(event.target.value)}
            pattern="[0-9]{6}"
            placeholder="XXX-XXX"
            required
            value={code}
          />
          <MfaPrimaryButton disabled={isSubmitting || !setup} type="submit">
            {isSubmitting ? "SAVING" : "SAVE"}
          </MfaPrimaryButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MfaDisableDialog({
  onDisabled,
  onOpenChange,
  open,
}: {
  onDisabled: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await disableMfa(code);
      toast.success("2FA has been removed");
      onDisabled();
      onOpenChange(false);
      setCode("");
    } catch (error) {
      toast.error("2FA removal failed", {
        description: getErrorMessage(error),
        classNames: { icon: "text-destructive" },
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--auth-background)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove 2FA</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5 text-center"
            inputMode="numeric"
            onChange={(event) => setCode(event.target.value)}
            placeholder="XXX-XXX"
            required
            value={code}
          />
          <MfaPrimaryButton disabled={isSubmitting} type="submit">
            {isSubmitting ? "REMOVING" : "REMOVE 2FA"}
          </MfaPrimaryButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QrCode({ size = 240, value }: { size?: number; value: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    void import("qr-creator").then(({ default: QrCreator }) => {
      if (!ref.current) {
        return;
      }

      ref.current.innerHTML = "";
      QrCreator.render(
        {
          background: "#ffffff",
          ecLevel: "H",
          fill: "#1f1230",
          radius: 0,
          size,
          text: value,
        },
        ref.current,
      );
    });
  }, [size, value]);

  return (
    <div
      className="mx-auto flex items-center justify-center rounded-sm bg-white"
      style={{ height: size, width: size }}
    >
      <div ref={ref} />
    </div>
  );
}

function MfaProfileSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mt-8 flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-normal">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MfaPrimaryButton({
  buttonStyle = "primary",
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  buttonStyle?: "primary" | "outline";
}) {
  return (
    <Button
      className={cn(
        "h-12 w-full rounded-full font-bold",
        buttonStyle === "primary"
          ? "bg-[var(--auth-primary)] text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
          : "border-2 border-[var(--auth-primary)] bg-card text-[var(--auth-foreground)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]",
        className,
      )}
      variant={buttonStyle === "outline" ? "outline" : "default"}
      {...props}
    >
      {children}
    </Button>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}
