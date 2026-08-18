import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Router creates Fetch API Request objects with the DOM AbortSignal.
// In some Node + jsdom combinations, global Request comes from Node/undici while
// AbortSignal comes from jsdom. Undici rejects that cross-realm signal before
// navigation starts. Keep the production code untouched and make the test-only
// Request constructor tolerate the jsdom signal; cancellation is still covered
// by browser E2E using the browser's single-realm Fetch implementation.
const NativeRequest = globalThis.Request;
if (typeof NativeRequest === "function") {
  function canConstructWithSignal(signal: AbortSignal) {
    try {
      new NativeRequest("http://localhost/", { signal });
      return true;
    } catch {
      return false;
    }
  }

  class CompatibleTestRequest extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      if (init?.signal && !canConstructWithSignal(init.signal)) {
        const compatibleInit = { ...init };
        delete compatibleInit.signal;
        super(input, compatibleInit);
      } else super(input, init);
    }
  }
  Object.defineProperty(globalThis, "Request", { configurable: true, writable: true, value: CompatibleTestRequest });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  window.history.pushState({}, "", "/");
});
