"use client"

import type { SigningField } from "@/lib/api/signing"
import type {
  SubmissionDocumentResponse,
  SubmissionResponse,
} from "@/lib/api/submissions"
import { SubmissionFieldValue } from "./submission-field-display"

export type SubmissionPreviewDocument = SubmissionDocumentResponse & {
  filename: string
  preview_images: NonNullable<SubmissionDocumentResponse["preview_images"]>
  uuid: string
}

type SubmissionDocumentViewerProps = {
  documents: SubmissionPreviewDocument[]
  fields: SigningField[]
  showFieldOverlays: boolean
  submission: SubmissionResponse
  title: string
}

export function SubmissionDocumentThumbnails({
  documents,
  title,
}: Pick<SubmissionDocumentViewerProps, "documents" | "title">) {
  return (
    <aside className="hidden w-52 shrink-0 overflow-y-auto pr-3 pt-1 lg:block">
      {documents.map((document) => {
        const preview = document.preview_images[0]

        return preview ? (
          <a
            className="block cursor-pointer"
            href={`#document-${document.uuid}-0`}
            key={document.uuid}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${title} thumbnail`}
              className="rounded border border-[var(--auth-input-border)] bg-white"
              height={getMetadataNumber(preview.metadata.height, 280)}
              src={preview.url}
              width={getMetadataNumber(preview.metadata.width, 200)}
            />
            <div className="px-2 py-2 text-center">{document.filename}</div>
          </a>
        ) : null
      })}
    </aside>
  )
}

export function SubmissionDocumentPreview({
  documents,
  fields,
  showFieldOverlays,
  submission,
  title,
}: SubmissionDocumentViewerProps) {
  return (
    <section className="min-w-0 flex-1 overflow-y-auto px-0 pt-1 sm:px-1">
      <div className="flex flex-col items-center gap-4 sm:pr-3">
        {documents.map((document) =>
          document.preview_images.map((previewImage, pageIndex) => (
            <DocumentPage
              document={document}
              fields={fields}
              key={`${document.uuid}-${previewImage.id}`}
              pageIndex={pageIndex}
              previewImage={previewImage}
              showFieldOverlays={showFieldOverlays}
              submission={submission}
              title={title}
            />
          )),
        )}
      </div>
    </section>
  )
}

function DocumentPage({
  document,
  fields,
  pageIndex,
  previewImage,
  showFieldOverlays,
  submission,
  title,
}: {
  document: SubmissionPreviewDocument
  fields: SigningField[]
  pageIndex: number
  previewImage: SubmissionPreviewDocument["preview_images"][number]
  showFieldOverlays: boolean
  submission: SubmissionResponse
  title: string
}) {
  const width = getMetadataNumber(previewImage.metadata.width, 1000)
  const height = getMetadataNumber(previewImage.metadata.height, 1400)
  const pageFields = fields.filter((field) =>
    field.areas?.some(
      (area) => area.attachment_uuid === document.uuid && area.page === pageIndex,
    ),
  )

  return (
    <div
      className="relative w-full max-w-[1040px] overflow-hidden rounded border border-[var(--auth-input-border)] bg-white shadow-sm"
      id={`document-${document.uuid}-${pageIndex}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`${title} page ${pageIndex + 1}`}
        className="h-full w-full object-contain"
        height={height}
        loading="lazy"
        src={previewImage.url}
        width={width}
      />
      {showFieldOverlays ? (
        <div className="absolute inset-0">
          {pageFields.flatMap((field) =>
            (field.areas ?? [])
              .filter(
                (area) =>
                  area.attachment_uuid === document.uuid &&
                  area.page === pageIndex,
              )
              .map((area, index) => (
                <div
                  className="absolute flex items-center justify-center bg-red-100/50 px-1 text-[var(--auth-primary)]"
                  key={`${field.uuid}-${index}`}
                  style={areaToStyle(area)}
                >
                  <SubmissionFieldValue field={field} submission={submission} />
                </div>
              )),
          )}
        </div>
      ) : null}
    </div>
  )
}

function areaToStyle(area: { h?: number; w?: number; x?: number; y?: number }) {
  return {
    height: `${(area.h ?? 0.04) * 100}%`,
    left: `${(area.x ?? 0) * 100}%`,
    top: `${(area.y ?? 0) * 100}%`,
    width: `${(area.w ?? 0.2) * 100}%`,
  }
}

function getMetadataNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}
