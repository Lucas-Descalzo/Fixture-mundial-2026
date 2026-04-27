import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

import {
  createInitialFixtureState,
  normalizeFixtureState,
} from "@/lib/world-cup-fixture";
import type { FixtureState } from "@/lib/world-cup-types";

const STORAGE_KEY = "fwc26-fixture-state";

export function encodeFixtureState(state: FixtureState) {
  return compressToEncodedURIComponent(JSON.stringify(state));
}

export function decodeFixtureState(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  try {
    const json = decompressFromEncodedURIComponent(input);
    if (!json) {
      return null;
    }

    const parsed = JSON.parse(json) as Partial<FixtureState>;
    return normalizeFixtureState(parsed);
  } catch {
    return null;
  }
}

export function loadFixtureStateFromBrowser() {
  if (typeof window === "undefined") {
    return {
      state: createInitialFixtureState(),
      source: "empty" as const,
    };
  }

  const url = new URL(window.location.href);
  const encodedFromUrl = url.searchParams.get("p");
  const fromUrl = decodeFixtureState(encodedFromUrl);
  if (fromUrl) {
    if (encodedFromUrl) {
      window.localStorage.setItem(STORAGE_KEY, encodedFromUrl);
    }

    url.searchParams.delete("p");
    window.history.replaceState({}, "", url);

    return {
      state: fromUrl,
      source: "url" as const,
    };
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  const fromStorage = decodeFixtureState(stored);
  if (fromStorage) {
    return {
      state: fromStorage,
      source: "storage" as const,
    };
  }

  return {
    state: createInitialFixtureState(),
    source: "empty" as const,
  };
}

export function persistFixtureState(state: FixtureState) {
  if (typeof window === "undefined") {
    return "";
  }

  const encoded = encodeFixtureState(state);
  const url = new URL(window.location.href);
  url.searchParams.set("p", encoded);

  window.localStorage.setItem(STORAGE_KEY, encoded);

  return url.toString();
}

export function clearPersistedFixtureState() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("p");
  window.history.replaceState({}, "", url);
  window.localStorage.removeItem(STORAGE_KEY);
}
