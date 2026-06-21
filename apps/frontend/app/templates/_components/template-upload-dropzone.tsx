"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, UploadCloudIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/kibo-ui/dropzone";
import { Spinner } from "@/components/ui/spinner";
import { createTemplateFromDocument } from "@/lib/api/templates";

const acceptedDocumentTypes = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
};

export function TemplateUploadDropzone() {
  const router = useRouter();
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
      () => <UploadToast message={`Preparing ${file.name}...`} />,
      { duration: Infinity },
    );

    try {
      toast.custom(
        () => <UploadToast message={`Uploading ${file.name}...`} />,
        {
          duration: Infinity,
          id: toastId.current,
        },
      );

      const template = await createTemplateFromDocument(file);

      toast.custom(
        () => (
          <UploadSuccessToast
            description="Opening template editor."
            title={`${file.name} uploaded`}
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
        error instanceof Error ? error.message : "Upload failed. Try again.";

      toast.error("Document upload failed", {
        description: message,
        classNames: { icon: "text-destructive" },
      });
      setFiles(undefined);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dropzone
      accept={acceptedDocumentTypes}
      className="min-h-52 rounded-2xl border-dashed border-[var(--auth-input-border)] bg-transparent text-center hover:border-[var(--auth-primary)] hover:bg-card"
      disabled={isUploading}
      maxFiles={1}
      onDrop={handleDrop}
      src={files}
    >
      <DropzoneEmptyState>
        <div className="flex flex-col items-center justify-center">
          <UploadCloudIcon className="mb-2 text-[var(--auth-primary)]" />
          <span className="text-base font-bold">Upload a New Document</span>
          <span className="mt-2 text-sm">Click to upload or drag and drop</span>
          <span className="mt-8 text-sm">
            Or add from{" "}
            <span className="font-bold text-[var(--auth-primary)]">
              Google Drive
            </span>
          </span>
        </div>
      </DropzoneEmptyState>
      <DropzoneContent />
    </Dropzone>
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
