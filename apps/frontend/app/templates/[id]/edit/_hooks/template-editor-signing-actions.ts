"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { toast } from "sonner";

import { getAuthSession } from "@/lib/api/auth";
import { createSubmission } from "@/lib/api/submissions";
import type { TemplateResponse } from "@/lib/api/templates";
import type { TemplateSubmitter } from "../_lib/template-editor-model";

type Context = {
  currentSubmitters: TemplateSubmitter[];
  currentTemplate: TemplateResponse;
  router: AppRouterInstance;
  setIsOpeningSelfSign: (isOpening: boolean) => void;
};

export function createTemplateEditorSigningActions(context: Context) {
  const { currentSubmitters, currentTemplate, router, setIsOpeningSelfSign } =
    context;

  async function openSelfSigningForm() {
    const primarySubmitter = currentSubmitters.at(0);

    if (!primarySubmitter) {
      toast.error("Self-signing form could not be opened", {
        description: "Add a role before signing this template yourself.",
      });
      return;
    }

    const session = getAuthSession();
    const signingWindow = window.open("", "_blank");
    const userName = [
      session?.user.first_name ?? "",
      session?.user.last_name ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    setIsOpeningSelfSign(true);

    try {
      const [submitter] = await createSubmission({
        name: currentTemplate.name,
        template_id: currentTemplate.id,
        submitters: [
          {
            email: session?.user.email,
            name: userName || session?.user.email || "Self signer",
            role: primarySubmitter.name ?? "First Party",
          },
        ],
      });

      if (!submitter?.slug) {
        throw new Error("The signing link was not returned by the API.");
      }

      if (signingWindow) {
        signingWindow.location.href = `/s/${submitter.slug}`;
        signingWindow.focus();
      } else {
        router.push(`/s/${submitter.slug}`);
      }
    } catch (selfSignError) {
      signingWindow?.close();
      const message =
        selfSignError instanceof Error
          ? selfSignError.message
          : "The signing form could not be created.";

      toast.error("Self-signing form could not be opened", {
        description: message,
      });
    } finally {
      setIsOpeningSelfSign(false);
    }
  }

  return {
    openSelfSigningForm,
  };
}
