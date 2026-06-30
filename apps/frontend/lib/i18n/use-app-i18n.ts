"use client";

import { useSyncExternalStore } from "react";

import { getAuthSession, subscribeToAuthSessionChange } from "@/lib/api/auth";
import { appDictionaries } from "./app-dictionaries";
import {
  defaultLocale,
  getStoredLocale,
  localeStorageEvent,
  normalizeLocale,
  persistLocale,
  type Locale,
} from "./config";

export function useAppI18n() {
  const locale = useSyncExternalStore(
    subscribeToLocaleChange,
    getLocaleSnapshot,
    getDefaultLocaleSnapshot,
  );

  return {
    dictionary: appDictionaries[locale],
    locale,
    setLocale: persistLocale,
  };
}

export function getCurrentLocale(): Locale {
  const storedLocale = getStoredLocale();

  if (storedLocale) {
    return storedLocale;
  }

  return normalizeLocale(getAuthSession()?.account.locale);
}

function subscribeToLocaleChange(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const unsubscribeAuth = subscribeToAuthSessionChange(listener);

  window.addEventListener(localeStorageEvent, listener);
  window.addEventListener("storage", listener);

  return () => {
    unsubscribeAuth();
    window.removeEventListener(localeStorageEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function getLocaleSnapshot(): Locale {
  return getCurrentLocale();
}

function getDefaultLocaleSnapshot(): Locale {
  return defaultLocale;
}
