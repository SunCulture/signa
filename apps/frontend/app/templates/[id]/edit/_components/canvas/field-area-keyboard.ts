import type { KeyboardEvent } from "react";

import type { TemplateEditorField } from "../../_lib/template-editor-model";

export function handleFieldAreaKeyboard({
  event,
  field,
  onCopySelectedFields,
  onDeleteSelectedFields,
  onNudgeSelectedFields,
  onPasteCopiedFields,
}: {
  event: KeyboardEvent<HTMLDivElement>;
  field: TemplateEditorField;
  onCopySelectedFields: (fieldUuid?: string) => void;
  onDeleteSelectedFields: (fieldUuid?: string) => Promise<void>;
  onNudgeSelectedFields: (
    fieldUuid: string,
    dx: number,
    dy: number,
  ) => Promise<void>;
  onPasteCopiedFields: () => Promise<void>;
}) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
    event.preventDefault();
    onCopySelectedFields(field.uuid);
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
    event.preventDefault();
    void onPasteCopiedFields();
    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    void onDeleteSelectedFields(field.uuid);
    return;
  }

  if (
    event.key !== "ArrowUp" &&
    event.key !== "ArrowDown" &&
    event.key !== "ArrowLeft" &&
    event.key !== "ArrowRight"
  ) {
    return;
  }

  event.preventDefault();
  const step = event.shiftKey ? 0.02 : 0.005;

  void onNudgeSelectedFields(
    field.uuid,
    event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
    event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0,
  );
}
