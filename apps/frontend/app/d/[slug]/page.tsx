"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { FileWarningIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/http";
import {
  listTemplates,
  type TemplateResponse,
} from "@/lib/api/templates";

export default function TemplateSharePreviewPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTemplates({ limit: 1, slug: params.slug })
      .then((response) => {
        const sharedTemplate = response.data[0] ?? null;

        if (!sharedTemplate) {
          setError("This shared template link could not be found.");
          return;
        }

        setTemplate(sharedTemplate);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof ApiError && loadError.status === 401) {
          router.push("/auth/login");
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Shared template could not be loaded.";

        setError(message);
        toast.error("Shared template unavailable", { description: message });
      });
  }, [params.slug, router]);

  if (error) {
    return <SharePreviewError message={error} />;
  }

  if (!template) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] text-[var(--auth-foreground)]">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Spinner />
          Loading shared template
        </div>
      </main>
    );
  }

  return <SharePreview template={template} />;
}

function SharePreview({ template }: { template: TemplateResponse }) {
  return (
    <main className="min-h-svh bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="mx-auto flex w-full max-w-[1000px] flex-col px-4 py-4 sm:px-6">
        <header className="sticky top-0 z-20 mx-auto mb-4 flex w-full max-w-[920px] items-center justify-between gap-4 bg-[var(--auth-background)]/95 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              alt="Signa"
              className="h-10 w-auto object-contain"
              height={48}
              priority
              src="/images/logo.png"
              width={84}
            />
            <h1 className="truncate text-xl font-bold sm:text-3xl">
              {template.name}
            </h1>
          </div>
          <span className="rounded-full bg-[var(--auth-muted)] px-4 py-2 text-xs font-bold text-[var(--auth-muted-foreground)]">
            SHARED LINK
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

function SharePreviewError({ message }: { message: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] px-6 text-[var(--auth-foreground)]">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <FileWarningIcon className="size-10 text-[var(--auth-primary)]" />
        <h1 className="text-2xl font-bold">Shared template unavailable</h1>
        <p className="text-sm text-[var(--auth-muted-foreground)]">
          {message}
        </p>
        <Button
          className="rounded-full bg-[var(--auth-primary)] px-6 text-[var(--auth-primary-foreground)]"
          onClick={() => window.location.assign("/templates")}
          type="button"
        >
          Back to templates
        </Button>
      </div>
    </main>
  );
}
