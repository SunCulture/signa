import type { GoogleDrivePickedFile } from "@/lib/api/templates";

type GooglePickerConfig = {
  appId: string;
  clientId: string;
  developerKey: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleTokenClient = {
  callback: (response: GoogleTokenResponse) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GooglePickerDocument = {
  id?: string;
  mimeType?: string;
  name?: string;
};

type GooglePickerResponse = {
  [key: string]: unknown;
  docs?: GooglePickerDocument[];
};

declare global {
  interface Window {
    gapi?: {
      load: (library: string, callback: () => void) => void;
    };
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            callback: (response: GoogleTokenResponse) => void;
            client_id: string;
            scope: string;
          }) => GoogleTokenClient;
        };
      };
      picker?: {
        Action: { CANCEL: string; PICKED: string };
        DocsView: new () => GooglePickerView;
        Feature: { MULTISELECT_ENABLED: string };
        PickerBuilder: new () => GooglePickerBuilder;
        Response: { ACTION: string; DOCUMENTS: string };
        ViewId: { DOCS: string };
      };
    };
  }
}

type GooglePickerView = {
  setIncludeFolders: (value: boolean) => GooglePickerView;
  setMimeTypes: (value: string) => GooglePickerView;
  setSelectFolderEnabled: (value: boolean) => GooglePickerView;
};

type GooglePickerBuilder = {
  addView: (view: GooglePickerView) => GooglePickerBuilder;
  enableFeature: (feature: string) => GooglePickerBuilder;
  setAppId: (appId: string) => GooglePickerBuilder;
  setCallback: (
    callback: (response: GooglePickerResponse) => void,
  ) => GooglePickerBuilder;
  setDeveloperKey: (developerKey: string) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  build: () => { setVisible: (value: boolean) => void };
};

const googleDriveScope = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const pickerMimeTypes = [
  "application/pdf",
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.presentation",
  "application/vnd.google-apps.spreadsheet",
  "image/jpeg",
  "image/png",
  "image/webp",
].join(",");

let pickerScriptsPromise: Promise<void> | null = null;

export async function pickGoogleDriveDocuments(): Promise<{
  accessToken: string;
  files: GoogleDrivePickedFile[];
}> {
  const config = getGooglePickerConfig();

  await loadGooglePickerScripts();
  const accessToken = await requestGoogleDriveAccessToken(config.clientId);
  const files = await openGoogleDrivePicker(config, accessToken);

  return { accessToken, files };
}

export function isGoogleDrivePickerConfigured(): boolean {
  try {
    getGooglePickerConfig();
    return true;
  } catch {
    return false;
  }
}

function getGooglePickerConfig(): GooglePickerConfig {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? "";
  const developerKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY ?? "";
  const appId = process.env.NEXT_PUBLIC_GOOGLE_PICKER_APP_ID ?? "";

  if (!clientId || !developerKey || !appId) {
    throw new Error(
      "Google Drive is not configured. Set NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID, NEXT_PUBLIC_GOOGLE_PICKER_API_KEY, and NEXT_PUBLIC_GOOGLE_PICKER_APP_ID.",
    );
  }

  return { appId, clientId, developerKey };
}

function loadGooglePickerScripts(): Promise<void> {
  pickerScriptsPromise ??= Promise.all([
    loadScript("https://accounts.google.com/gsi/client"),
    loadScript("https://apis.google.com/js/api.js"),
  ]).then(
    () =>
      new Promise<void>((resolve, reject) => {
        window.gapi?.load("picker", () => {
          if (window.google?.picker) {
            resolve();
          } else {
            reject(new Error("Google Picker could not be loaded."));
          }
        });
      }),
  );

  return pickerScriptsPromise;
}

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${src}"]`,
  );

  if (existing?.dataset.loaded === "true") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement("script");

    script.async = true;
    script.src = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));

    if (!existing) {
      document.head.appendChild(script);
    }
  });
}

function requestGoogleDriveAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? "Google Drive access was denied."));
          return;
        }

        resolve(response.access_token);
      },
      client_id: clientId,
      scope: googleDriveScope,
    });

    if (!tokenClient) {
      reject(new Error("Google Identity Services could not be loaded."));
      return;
    }

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

function openGoogleDrivePicker(
  config: GooglePickerConfig,
  accessToken: string,
): Promise<GoogleDrivePickedFile[]> {
  return new Promise((resolve, reject) => {
    const picker = window.google?.picker;

    if (!picker) {
      reject(new Error("Google Picker could not be loaded."));
      return;
    }

    const view = new picker.DocsView()
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false)
      .setMimeTypes(pickerMimeTypes);

    const dialog = new picker.PickerBuilder()
      .setAppId(config.appId)
      .setDeveloperKey(config.developerKey)
      .setOAuthToken(accessToken)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .addView(view)
      .setCallback((response) => {
        const action = response[picker.Response.ACTION];

        if (action === picker.Action.CANCEL) {
          resolve([]);
          return;
        }

        if (action !== picker.Action.PICKED) {
          return;
        }

        const docs =
          (response[picker.Response.DOCUMENTS] as GooglePickerDocument[]) ??
          response.docs ??
          [];
        const files = docs.flatMap((doc) =>
          doc.id
            ? [
                {
                  id: doc.id,
                  mime_type: doc.mimeType,
                  name: doc.name,
                },
              ]
            : [],
        );

        resolve(files);
      })
      .build();

    dialog.setVisible(true);
  });
}
