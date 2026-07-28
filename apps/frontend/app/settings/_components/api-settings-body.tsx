"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BookOpenIcon,
  BotIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  RefreshCcwIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  type ApiToken,
  type ApiTokenPermission,
  apiTokenPermissions,
  getApiToken,
  revealApiToken,
  rotateApiToken,
  updateApiTokenPermissions,
} from "@/lib/api/auth";
import { resolveBrowserApiUrl } from "@/lib/api/http";
import { useTestMode } from "@/lib/hooks/use-test-mode";
import { SettingsSidebar } from "./settings-sidebar";

const permissionLabels: Record<ApiTokenPermission, string> = {
  "templates:read": "Read templates",
  "templates:write": "Create and update templates",
  "submissions:read": "Read submissions",
  "submissions:write": "Create and update submissions",
  "submitters:read": "Read submitters",
  "submitters:write": "Update submitters",
  "webhooks:read": "Read webhooks",
  "webhooks:write": "Manage webhooks",
  "tools:use": "Use PDF tools",
  "users:read": "Read users",
  "users:write": "Manage users",
};

const examples = [
  {
    title: "Request signature with submitters",
    method: "POST",
    path: "/submissions",
    body: `{
  "template_id": 1,
  "submitters": [
    { "name": "John Doe", "role": "First Party", "email": "john@example.com" }
  ]
}`,
  },
  {
    title: "Request signature by emails",
    method: "POST",
    path: "/submissions/emails",
    body: `{
  "template_id": 1,
  "emails": "john@example.com, jane@example.com"
}`,
  },
  {
    title: "Template details",
    method: "GET",
    path: "/templates/1",
  },
];

export function ApiSettingsBody() {
  const [apiToken, setApiToken] = useState<ApiToken | null>(null);
  const [visibleToken, setVisibleToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const {
    isPending: isTestModePending,
    isTestMode,
    setTestMode,
  } = useTestMode();
  const displayedToken = visibleToken ?? apiToken?.token ?? "";

  useEffect(() => {
    getApiToken()
      .then((token) => {
        setApiToken(token);
        setVisibleToken(null);
      })
      .catch((error: unknown) =>
        toast.error("API token could not be loaded", {
          description: getErrorMessage(error),
        }),
      );
  }, [isTestMode]);

  const enabledPermissions = useMemo(
    () => new Set(apiToken?.permissions ?? []),
    [apiToken?.permissions],
  );

  async function reveal() {
    if (!password) {
      toast.error("Password is required");
      return;
    }

    setIsBusy(true);
    try {
      const response = await revealApiToken(password);

      setApiToken(response);
      setVisibleToken(response.revealed_token);
      toast.success("API token revealed");
    } catch (error) {
      toast.error("API token could not be revealed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function rotate() {
    if (!password) {
      toast.error("Password is required");
      return;
    }

    setIsBusy(true);
    try {
      const response = await rotateApiToken({
        password,
        permissions: apiToken?.permissions,
      });

      setApiToken(response);
      setVisibleToken(response.revealed_token);
      toast.success("API token rotated");
    } catch (error) {
      toast.error("API token could not be rotated", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function togglePermission(
    permission: ApiTokenPermission,
    value: boolean,
  ) {
    if (!apiToken) {
      return;
    }

    const permissions = value
      ? [...new Set([...apiToken.permissions, permission])]
      : apiToken.permissions.filter((item) => item !== permission);

    setApiToken({ ...apiToken, permissions });

    try {
      setApiToken(await updateApiTokenPermissions(permissions));
      toast.success("API permissions updated");
    } catch (error) {
      setApiToken(apiToken);
      toast.error("API permissions could not be updated", {
        description: getErrorMessage(error),
      });
    }
  }

  async function copyToken() {
    if (!displayedToken) {
      return;
    }

    await navigator.clipboard.writeText(displayedToken);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="flex flex-wrap gap-8 md:flex-nowrap">
      <SettingsSidebar active="API" />
      <section className="min-w-0 flex-1 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-4xl font-bold tracking-normal">API</h1>
          <label className="flex items-center gap-2 text-sm font-medium">
            <span>Test mode</span>
            <Switch
              checked={isTestMode}
              disabled={isTestModePending}
              onCheckedChange={setTestMode}
            />
          </label>
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--auth-muted)] p-6">
          <label className="text-sm font-bold">X-Auth-Token</label>
          <div className="mt-3 flex flex-col gap-4 md:flex-row">
            <Input
              className="h-12 flex-1 rounded-full font-mono"
              readOnly
              value={displayedToken}
            />
            <Button
              className="h-12 rounded-full px-6"
              disabled={isBusy || !apiToken}
              onClick={visibleToken ? () => setVisibleToken(null) : reveal}
              type="button"
            >
              {visibleToken ? (
                <EyeOffIcon data-icon="inline-start" />
              ) : (
                <EyeIcon data-icon="inline-start" />
              )}
              {visibleToken ? "HIDE" : "SHOW"}
            </Button>
            <Button
              className="h-12 rounded-full px-6"
              disabled={isBusy || !apiToken}
              onClick={copyToken}
              type="button"
              variant="outline"
            >
              <CopyIcon data-icon="inline-start" />
              COPY
            </Button>
            <Button
              className="h-12 rounded-full px-6"
              disabled={isBusy || !apiToken}
              onClick={rotate}
              type="button"
              variant="outline"
            >
              <RefreshCcwIcon data-icon="inline-start" />
              ROTATE
            </Button>
          </div>
          <Input
            className="mt-4 h-12 rounded-full"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password to reveal or rotate"
            type="password"
            value={password}
          />
        </div>

        <div className="mt-6 rounded-2xl bg-[var(--auth-muted)] p-6">
          <div className="flex items-center gap-3">
            <KeyRoundIcon />
            <div>
              <h2 className="text-xl font-bold">API key permissions</h2>
              <p className="text-sm text-muted-foreground">
                Permissions apply only when this key is used with X-Auth-Token.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {apiTokenPermissions.map((permission) => (
              <label
                className="flex items-center justify-between gap-4 rounded-xl bg-background/70 px-4 py-3"
                key={permission}
              >
                <span>{permissionLabels[permission]}</span>
                <Switch
                  checked={enabledPermissions.has(permission)}
                  onCheckedChange={(value) =>
                    void togglePermission(permission, value)
                  }
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <InfoRow
            icon={<BookOpenIcon />}
            title="Explore our API"
            description="Discover Signa with cURL, Postman, and OpenAPI."
          />
          <InfoRow
            icon={<BotIcon />}
            title="AI Plugins"
            description="Add Signa API context to your coding agent."
          />
        </div>

        <h2 className="mt-7 text-3xl font-bold tracking-normal">Examples</h2>
        <Accordion
          className="mt-4 flex flex-col gap-4"
          collapsible
          type="single"
        >
          {examples.map((example) => (
            <AccordionItem
              className="overflow-hidden rounded-2xl border-0 bg-[var(--auth-muted)] px-1"
              key={example.title}
              value={example.title}
            >
              <AccordionTrigger className="px-5 py-4 text-left text-lg font-bold hover:no-underline">
                <div>
                  <p>{example.title}</p>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-full bg-[var(--auth-upgrade)] px-3 py-1 text-xs">
                      {example.method}
                    </span>
                    <span className="rounded-full bg-[var(--auth-primary)] px-3 py-1 text-xs text-[var(--auth-primary-foreground)]">
                      {example.path}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <pre className="overflow-auto rounded-xl bg-[#161225] p-4 text-sm text-white">
                  <code>{buildCurlExample(example, displayedToken)}</code>
                </pre>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}

function InfoRow({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-2xl bg-[var(--auth-muted)] p-5">
      <div className="flex items-center gap-4">
        {icon}
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function buildCurlExample(
  example: { method: string; path: string; body?: string },
  token: string,
): string {
  const lines = [
    `curl --location '${resolveBrowserApiUrl()}${example.path}'`,
    `  --header 'X-Auth-Token: ${token || "API_TOKEN"}'`,
  ];

  if (example.body) {
    lines.push(`  --header 'Content-Type: application/json'`);
    lines.push(`  --data-raw '${example.body}'`);
  }

  return lines.join(" \\\n");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}
