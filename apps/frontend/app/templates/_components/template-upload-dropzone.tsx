"use client";

import { type MouseEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, UploadCloudIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/kibo-ui/dropzone";
import { Spinner } from "@/components/ui/spinner";
import {
  addTemplateGoogleDriveDocuments,
  createTemplate,
  createTemplateFromDocument,
} from "@/lib/api/templates";
import { pickGoogleDriveDocuments } from "@/lib/google-drive/picker";
import { useAppI18n } from "@/lib/i18n/use-app-i18n";

const acceptedDocumentTypes = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
};

export function TemplateUploadDropzone({
  folderName,
}: {
  folderName?: string;
}) {
  const router = useRouter();
  const { dictionary } = useAppI18n();
  const text = dictionary.templates;
  const [files, setFiles] = useState<File[]>();
  const [isUploading, setIsUploading] = useState(false);
  const toastId = useRef<string | number | undefined>(undefined);

  async function handleDrop(acceptedFiles: File[]) {
    const file = acceptedFiles.at(0);

    if (!file) {
      return;
    }

    setFiles(acceptedFiles);
    setIsUploading(true);
    toastId.current = toast.custom(
      () => (
        <UploadToast
          message={interpolate(text.toasts.preparingUpload, {
            file: file.name,
          })}
        />
      ),
      { duration: Infinity },
    );

    try {
      toast.custom(
        () => <UploadToast message={`${text.toasts.uploadingDocument}...`} />,
        {
          duration: Infinity,
          id: toastId.current,
        },
      );

      const template = await createTemplateFromDocument(file, folderName);

      toast.custom(
        () => (
          <UploadSuccessToast
            description={text.toasts.openingEditor}
            title={`${file.name} - ${text.toasts.documentUploaded}`}
          />
        ),
        {
          duration: 4000,
          id: toastId.current,
        },
      );
      router.push(`/templates/${template.id}/edit`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `${text.toasts.uploadFailed}.`;

      toast.error(text.toasts.uploadFailed, {
        description: message,
        classNames: { icon: "text-destructive" },
      });
      setFiles(undefined);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleGoogleDriveImport(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    setIsUploading(true);
    toastId.current = toast.custom(
      () => <UploadToast message={text.uploadDropzone.openingDrive} />,
      { duration: Infinity },
    );

    try {
      const picked = await pickGoogleDriveDocuments();

      if (picked.files.length === 0) {
        toast.info(text.toasts.driveNoFiles, { id: toastId.current });
        return;
      }

      const firstFileName = picked.files.at(0)?.name?.trim();
      const template = await createTemplate({
        folder_name: folderName,
        name: firstFileName || text.create.title,
        shared_link: true,
      });

      toast.custom(
        () => <UploadToast message={`${text.toasts.openingDrive}...`} />,
        { duration: Infinity, id: toastId.current },
      );

      await addTemplateGoogleDriveDocuments(template.id, {
        access_token: picked.accessToken,
        files: picked.files,
        merge: true,
      });

      toast.custom(
        () => (
          <UploadSuccessToast
            description={text.toasts.openingEditor}
            title={text.toasts.driveImported}
          />
        ),
        {
          duration: 4000,
          id: toastId.current,
        },
      );
      router.push(`/templates/${template.id}/edit`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `${text.toasts.driveImportFailed}.`;

      toast.error(text.toasts.driveImportFailed, {
        description: message,
        classNames: { icon: "text-destructive" },
        id: toastId.current,
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="relative">
      <Dropzone
        accept={acceptedDocumentTypes}
        className="min-h-52 rounded-2xl border-dashed border-[var(--auth-input-border)] bg-transparent pb-14 text-center hover:border-[var(--auth-primary)] hover:bg-card"
        disabled={isUploading}
        maxFiles={1}
        onDrop={handleDrop}
        src={files}
      >
        <DropzoneEmptyState>
          <div className="flex flex-col items-center justify-center">
            <UploadCloudIcon className="mb-2 text-[var(--auth-primary)]" />
            <span className="text-base font-bold">
              {text.uploadDropzone.title}
            </span>
            <span className="mt-2 text-sm">
              {text.uploadDropzone.body}
            </span>
          </div>
        </DropzoneEmptyState>
        <DropzoneContent />
      </Dropzone>
      <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center text-sm">
        <span>
          {text.uploadDropzone.orAddFrom}{" "}
          <button
            className="pointer-events-auto font-bold text-[var(--auth-primary)] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUploading}
            onClick={handleGoogleDriveImport}
            type="button"
          >
            {text.uploadDropzone.drive}
          </button>
        </span>
      </div>
    </div>
  );
}

function interpolate(
  value: string,
  replacements: Record<string, string>,
): string {
  return Object.entries(replacements).reduce(
    (current, [key, replacement]) =>
      current.replaceAll(`{${key}}`, replacement),
    value,
  );
}

function UploadToast({ message }: { message: string }) {
  return (
    <div className="flex w-[356px] items-center gap-3 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-lg">
      <Spinner className="size-4 opacity-60" />
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}

function UploadSuccessToast({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex w-[356px] items-start gap-3 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-lg">
      <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
        <CheckIcon className="size-3" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
