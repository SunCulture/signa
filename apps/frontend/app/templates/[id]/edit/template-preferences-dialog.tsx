"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TemplateResponse } from "@/lib/api/templates";
import { formStateToPreferences, preferencesToFormState } from "./template-preferences-mapping";
import { TemplateEmbeddingPanel } from "./template-embedding-panel";
import { TemplatePreferencesGeneralForm } from "./template-preferences-general-form";

type TemplatePreferencesDialogProps = {
  isSaving: boolean;
  isUpdatingSharedLink: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (preferences: Record<string, unknown>) => Promise<void>;
  onSharedLinkChange: (enabled: boolean) => Promise<void>;
  onTestingShareChange: (enabled: boolean) => Promise<void>;
  open: boolean;
  template: TemplateResponse;
};

export function TemplatePreferencesDialog({
  isSaving,
  isUpdatingSharedLink,
  onOpenChange,
  onSave,
  onSharedLinkChange,
  onTestingShareChange,
  open,
  template,
}: TemplatePreferencesDialogProps) {
  const [formState, setFormState] = useState(() =>
    preferencesToFormState(template.preferences),
  );

  if (!open) {
    return null;
  }

  async function savePreferences() {
    await onSave(formStateToPreferences(formState));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-3 py-5 backdrop-blur-sm sm:py-8">
      <section
        aria-modal="true"
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[var(--auth-background)] text-[var(--auth-foreground)] shadow-2xl"
        role="dialog"
      >
        <PreferencesDialogHeader onClose={() => onOpenChange(false)} />
        <Tabs
          className="max-h-[calc(100svh-8rem)] overflow-y-auto px-5 pb-5 pt-3"
          defaultValue="general"
        >
          <TabsList className="mx-auto mb-5 grid w-full max-w-md grid-cols-2 rounded-full bg-[var(--auth-muted)]">
            <TabsTrigger className="rounded-full font-bold" value="general">
              General
            </TabsTrigger>
            <TabsTrigger className="rounded-full font-bold" value="api">
              API and Embedding
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <TemplatePreferencesGeneralForm
              formState={formState}
              isSaving={isSaving}
              onSave={savePreferences}
              onStateChange={setFormState}
            />
          </TabsContent>
          <TabsContent value="api">
            <TemplateEmbeddingPanel
              isUpdatingSharedLink={isUpdatingSharedLink}
              template={template}
              onSharedLinkChange={onSharedLinkChange}
              onTestingShareChange={onTestingShareChange}
            />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function PreferencesDialogHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--auth-input-border)] px-5 py-4">
      <h2 className="text-lg font-bold">Preferences</h2>
      <Button
        aria-label="Close preferences"
        className="size-8 rounded-full"
        onClick={onClose}
        size="icon"
        type="button"
        variant="ghost"
      >
        <XIcon data-icon="icon-only" />
      </Button>
    </header>
  );
}
