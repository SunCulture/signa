"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, FileWarningIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/http";
import {
  getTemplate,
  type TemplateResponse,
} from "@/lib/api/templates";

export default function TemplateFormPreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTemplate(params.id)
      .then(setTemplate)
      .catch((loadError: unknown) => {
        if (loadError instanceof ApiError && loadError.status === 401) {
          router.push("/auth/login");
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Template preview could not be loaded.";

        setError(message);
        toast.error("Preview unavailable", { description: message });
      });
  }, [params.id, router]);

  if (error) {
    return <TemplatePreviewError message={error} templateId={params.id} />;
  }

  if (!template) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] text-[var(--auth-foreground)]">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Spinner />
          Loading preview
        </div>
      </main>
    );
  }

  return <TemplatePreview template={template} />;
}

function TemplatePreview({ template }: { template: TemplateResponse }) {
  return (
    <main className="min-h-svh bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="mx-auto flex w-full max-w-[1000px] flex-col px-4 py-4 sm:px-6">
        <header className="sticky top-0 z-20 mx-auto mb-4 flex w-full max-w-[920px] items-center justify-between gap-4 bg-[var(--auth-background)]/95 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              asChild
              className="size-10 shrink-0 rounded-full text-[var(--auth-primary)]"
              size="icon"
              type="button"
              variant="ghost"
            >
              <Link href={`/templates/${template.id}/edit`}>
                <ArrowLeftIcon data-icon="icon-only" />
              </Link>
            </Button>
            <h1 className="truncate text-xl font-bold sm:text-3xl">
              {template.name}
            </h1>
          </div>
          <span className="rounded-full bg-[var(--auth-muted)] px-4 py-2 text-xs font-bold text-[var(--auth-muted-foreground)]">
            PREVIEW
          </span>
        </header>

        <section className="flex flex-col items-center gap-5 pb-12">
          {template.documents.map((document) =>
            document.preview_images.map((previewImage, pageIndex) => (
              <TemplatePreviewPage
                key={`${document.uuid}-${previewImage.id ?? pageIndex}`}
                pageIndex={pageIndex}
                previewImage={previewImage}
                templateName={template.name}
              />
            )),
          )}
        </section>
      </div>
    </main>
  );
}

function TemplatePreviewPage({
  pageIndex,
  previewImage,
  templateName,
}: {
  pageIndex: number;
  previewImage: TemplateResponse["documents"][number]["preview_images"][number];
  templateName: string;
}) {
  const width = previewImage.metadata.width ?? 1000;
  const height = previewImage.metadata.height ?? 1400;

  return (
    <div
      className="relative w-full max-w-[920px] overflow-hidden rounded border border-[var(--auth-input-border)] bg-white shadow-sm"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`${templateName} page ${pageIndex + 1}`}
        className="h-full w-full object-contain"
        height={height}
        src={previewImage.url}
        width={width}
      />
    </div>
  );
}

function TemplatePreviewError({
  message,
  templateId,
}: {
  message: string;
  templateId: string;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] px-6 text-[var(--auth-foreground)]">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <FileWarningIcon className="size-10 text-[var(--auth-primary)]" />
        <h1 className="text-2xl font-bold">Preview unavailable</h1>
        <p className="text-sm text-[var(--auth-muted-foreground)]">
          {message}
        </p>
        <Button
          asChild
          className="rounded-full bg-[var(--auth-primary)] px-6 text-[var(--auth-primary-foreground)]"
        >
          <Link href={`/templates/${templateId}/edit`}>Back to editor</Link>
        </Button>
      </div>
    </main>
  );
}
