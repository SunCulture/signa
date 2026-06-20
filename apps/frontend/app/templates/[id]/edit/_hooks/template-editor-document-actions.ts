"use client";

import { toast } from "sonner";

import {
  addTemplateDocument,
  getTemplate,
  type TemplateDocument,
  type TemplateResponse,
  updateTemplate,
} from "@/lib/api/templates";
import {
  removeFieldsForAttachment,
  rewriteFieldAttachmentUuid,
} from "../_lib/template-editor-model";

type Context = {
  currentTemplate: TemplateResponse;
  setIsUploadingDocument: (isUploading: boolean) => void;
  setSelectedDocumentUuid: (documentUuid: string | null) => void;
  setTemplate: (
    updater:
      | TemplateResponse
      | ((template: TemplateResponse | null) => TemplateResponse | null),
  ) => void;
};

export function createTemplateEditorDocumentActions(context: Context) {
  const {
    currentTemplate,
    setIsUploadingDocument,
    setSelectedDocumentUuid,
    setTemplate,
  } = context;

  async function renameDocument(document: TemplateDocument, name: string) {
    const nextSchema = currentTemplate.schema.some(
      (item) => item.attachment_uuid === document.uuid,
    )
      ? currentTemplate.schema.map((item) =>
          item.attachment_uuid === document.uuid ? { ...item, name } : item,
        )
      : [...currentTemplate.schema, { attachment_uuid: document.uuid, name }];

    await updateTemplate(currentTemplate.id, { schema: nextSchema });

    setTemplate((previousTemplate) =>
      previousTemplate?.id === currentTemplate.id
        ? { ...previousTemplate, schema: nextSchema }
        : previousTemplate,
    );
  }

  async function addDocument(file: File) {
    const existingUuids = new Set(
      currentTemplate.documents.map((document) => document.uuid),
    );

    setIsUploadingDocument(true);
    toast.loading("Uploading document", {
      description: file.name,
      id: "template-document-upload",
    });

    try {
      await addTemplateDocument(currentTemplate.id, file);
      const refreshedTemplate = await getTemplate(currentTemplate.id);
      const addedDocument =
        refreshedTemplate.documents.find(
          (document) => !existingUuids.has(document.uuid),
        ) ?? refreshedTemplate.documents.at(-1);

      setTemplate(refreshedTemplate);
      setSelectedDocumentUuid(addedDocument?.uuid ?? null);
      toast.success("Document added", {
        description: file.name,
        id: "template-document-upload",
      });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Document could not be added.";

      toast.error("Document upload failed", {
        description: message,
        id: "template-document-upload",
      });
    } finally {
      setIsUploadingDocument(false);
    }
  }

  async function replaceDocument(document: TemplateDocument, file: File) {
    const schemaItem = currentTemplate.schema.find(
      (item) => item.attachment_uuid === document.uuid,
    );

    if (!schemaItem) {
      toast.error("Document could not be replaced", {
        description: "The document is missing from the template schema.",
      });
      return;
    }

    setIsUploadingDocument(true);
    toast.loading("Replacing document", {
      description: file.name,
      id: "template-document-upload",
    });

    try {
      const uploadResponse = await addTemplateDocument(
        currentTemplate.id,
        file,
      );
      const replacementSchemaItem = uploadResponse.schema.at(0);
      const replacementDocument = uploadResponse.documents.find(
        (item) => item.uuid === replacementSchemaItem?.attachment_uuid,
      );

      if (!replacementSchemaItem || !replacementDocument) {
        throw new Error("Replacement document was not returned by the API.");
      }

      const nextSchema = currentTemplate.schema.map((item) =>
        item.attachment_uuid === document.uuid
          ? { ...schemaItem, ...replacementSchemaItem }
          : item,
      );
      const nextFields = rewriteFieldAttachmentUuid(
        currentTemplate.fields,
        document.uuid,
        replacementDocument.uuid,
      );

      await updateTemplate(currentTemplate.id, {
        fields: nextFields,
        schema: nextSchema,
      });

      const refreshedTemplate = await getTemplate(currentTemplate.id);
      setTemplate(refreshedTemplate);
      setSelectedDocumentUuid(replacementDocument.uuid);
      toast.success("Document replaced", {
        description: file.name,
        id: "template-document-upload",
      });
    } catch (replaceError) {
      const message =
        replaceError instanceof Error
          ? replaceError.message
          : "Document could not be replaced.";

      toast.error("Document replace failed", {
        description: message,
        id: "template-document-upload",
      });
    } finally {
      setIsUploadingDocument(false);
    }
  }

  async function removeDocument(document: TemplateDocument) {
    if (currentTemplate.documents.length <= 1) {
      toast.error("At least one document is required");
      return;
    }

    if (!window.confirm("Remove this document from the template?")) {
      return;
    }

    const nextSchema = currentTemplate.schema.filter(
      (item) => item.attachment_uuid !== document.uuid,
    );
    const nextFields = removeFieldsForAttachment(
      currentTemplate.fields,
      document.uuid,
    );

    try {
      await updateTemplate(currentTemplate.id, {
        fields: nextFields,
        schema: nextSchema,
      });

      const refreshedTemplate = await getTemplate(currentTemplate.id);
      setTemplate(refreshedTemplate);
      setSelectedDocumentUuid(refreshedTemplate.documents.at(0)?.uuid ?? null);
      toast.success("Document removed");
    } catch (removeError) {
      const message =
        removeError instanceof Error
          ? removeError.message
          : "Document could not be removed.";

      toast.error("Document remove failed", { description: message });
    }
  }

  async function moveDocument(document: TemplateDocument, direction: -1 | 1) {
    const currentIndex = currentTemplate.schema.findIndex(
      (item) => item.attachment_uuid === document.uuid,
    );
    const nextIndex = currentIndex + direction;

    if (
      currentIndex === -1 ||
      nextIndex < 0 ||
      nextIndex >= currentTemplate.schema.length
    ) {
      return;
    }

    const nextSchema = [...currentTemplate.schema];
    const [movedItem] = nextSchema.splice(currentIndex, 1);
    nextSchema.splice(nextIndex, 0, movedItem);

    try {
      await updateTemplate(currentTemplate.id, { schema: nextSchema });
      const refreshedTemplate = await getTemplate(currentTemplate.id);
      setTemplate(refreshedTemplate);
      setSelectedDocumentUuid(document.uuid);
    } catch (moveError) {
      const message =
        moveError instanceof Error
          ? moveError.message
          : "Document order could not be updated.";

      toast.error("Document reorder failed", { description: message });
    }
  }

  return {
    addDocument,
    moveDocument,
    removeDocument,
    renameDocument,
    replaceDocument,
  };
}
