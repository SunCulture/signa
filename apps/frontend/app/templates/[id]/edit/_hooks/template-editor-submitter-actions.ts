"use client";

import { toast } from "sonner";

import {
  getPartyName,
  type SubmitterRemovalMode,
  type TemplateEditorField,
  type TemplateSubmitter,
} from "../_lib/template-editor-model";

type Context = {
  currentFields: TemplateEditorField[];
  currentSubmitters: TemplateSubmitter[];
  persistTemplateStructure: (options: {
    fields?: TemplateEditorField[];
    submitters?: TemplateSubmitter[];
    successMessage?: string;
  }) => Promise<void>;
  selectedField: TemplateEditorField | null;
  selectedSubmitterUuid: string | null;
  setSelectedFieldUuid: (fieldUuid: string | null) => void;
  setSelectedSubmitterUuid: (submitterUuid: string | null) => void;
};

export function createTemplateEditorSubmitterActions(context: Context) {
  const {
    currentFields,
    currentSubmitters,
    persistTemplateStructure,
    selectedField,
    selectedSubmitterUuid,
    setSelectedFieldUuid,
    setSelectedSubmitterUuid,
  } = context;

  async function addSubmitter(fieldUuid?: string) {
    const submitter = {
      name: getPartyName(currentSubmitters.length),
      uuid: crypto.randomUUID(),
    };
    const nextFields = fieldUuid
      ? currentFields.map((field) =>
          field.uuid === fieldUuid
            ? { ...field, submitter_uuid: submitter.uuid }
            : field,
        )
      : undefined;

    setSelectedSubmitterUuid(submitter.uuid);

    if (fieldUuid) {
      setSelectedFieldUuid(fieldUuid);
    }

    await persistTemplateStructure({
      fields: nextFields,
      submitters: [...currentSubmitters, submitter],
      successMessage: fieldUuid ? "Role added and assigned" : "Role added",
    });
  }

  async function renameSubmitter(submitterUuid: string, name: string) {
    const nextName = name.trim() || "Signer";
    const nextSubmitters = currentSubmitters.map((submitter) =>
      submitter.uuid === submitterUuid
        ? { ...submitter, name: nextName }
        : submitter,
    );

    await persistTemplateStructure({ submitters: nextSubmitters });
  }

  async function removeSubmitter(
    submitterUuid: string,
    mode: SubmitterRemovalMode = "keep_fields",
  ) {
    if (currentSubmitters.length <= 1) {
      toast.error("At least one role is required");
      return;
    }

    const nextSubmitters = currentSubmitters.filter(
      (submitter) => submitter.uuid !== submitterUuid,
    );
    const fallbackSubmitter = nextSubmitters[0];

    if (!fallbackSubmitter) {
      return;
    }

    const nextFields =
      mode === "remove_fields"
        ? currentFields.filter(
            (field) => field.submitter_uuid !== submitterUuid,
          )
        : currentFields.map((field) =>
            field.submitter_uuid === submitterUuid
              ? { ...field, submitter_uuid: fallbackSubmitter.uuid }
              : field,
          );

    if (
      selectedField?.submitter_uuid === submitterUuid &&
      mode === "remove_fields"
    ) {
      setSelectedFieldUuid(null);
    }

    if (selectedSubmitterUuid === submitterUuid) {
      setSelectedSubmitterUuid(fallbackSubmitter.uuid);
    }

    await persistTemplateStructure({
      fields: nextFields,
      submitters: nextSubmitters,
      successMessage:
        mode === "remove_fields"
          ? "Role and assigned fields removed"
          : "Role removed and fields reassigned",
    });
  }

  return {
    addSubmitter,
    removeSubmitter,
    renameSubmitter,
  };
}
