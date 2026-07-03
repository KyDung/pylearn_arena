"use client";

import type { PyodideAPI, PyodideConfig } from "pyodide";

const PYODIDE_INDEX_URL = "/pyodide/";
const PYODIDE_SCRIPT_URL = `${PYODIDE_INDEX_URL}pyodide.js`;

declare global {
  interface Window {
    pyodide?: PyodideAPI;
    loadPyodide?: (options?: PyodideConfig) => Promise<PyodideAPI>;
  }
}

let pyodidePromise: Promise<PyodideAPI> | null = null;
let scriptPromise: Promise<void> | null = null;
let preloadScheduled = false;

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout?: number },
  ) => number;
};

const loadPyodideScript = (): Promise<void> => {
  if (window.loadPyodide) return Promise.resolve();

  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${PYODIDE_SCRIPT_URL}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Không tải được Pyodide script local.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = PYODIDE_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Không tải được Pyodide script local."));
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
};

export const loadLocalPyodide = async (): Promise<PyodideAPI> => {
  if (typeof window === "undefined") {
    throw new Error("Pyodide chỉ có thể tải trong trình duyệt.");
  }

  if (window.pyodide) {
    return window.pyodide;
  }

  if (!pyodidePromise) {
    pyodidePromise = loadPyodideScript().then(() => {
      if (!window.loadPyodide) {
        throw new Error("Pyodide script đã tải nhưng không có loadPyodide().");
      }

      return window.loadPyodide({
        indexURL: PYODIDE_INDEX_URL,
      });
    });
  }

  window.pyodide = await pyodidePromise;
  return window.pyodide;
};

export const preloadLocalPyodide = (): void => {
  if (typeof window === "undefined" || window.pyodide || preloadScheduled) {
    return;
  }

  preloadScheduled = true;

  const preload = () => {
    void loadLocalPyodide().catch((error) => {
      preloadScheduled = false;
      console.warn("Khong the preload Pyodide:", error);
    });
  };

  const idleWindow = window as WindowWithIdleCallback;
  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(preload, { timeout: 2000 });
    return;
  }

  window.setTimeout(preload, 600);
};

export const getPyodideIndexUrl = () => PYODIDE_INDEX_URL;
