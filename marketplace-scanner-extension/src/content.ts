import { scrapePage } from "./scrape";
import type { ExtensionMessage, ScrapeResponse } from "./types";

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (r: ScrapeResponse) => void) => {
    if (message?.type === "SCRAPE") {
      try {
        const row = scrapePage();
        sendResponse({ ok: true, row });
      } catch (e) {
        sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
  },
);
