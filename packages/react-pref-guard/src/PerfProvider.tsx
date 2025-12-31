// PerfProvider.tsx
import React, { useEffect } from "react";
import { flushMetrics } from "./collector";
import { showWarning } from "./warnings";
import { createAnalyzerWorker } from "./worker/createWorker";
import { isDev } from "./env";
import { getRulesConfig } from "./pref-engine/rules";

let worker: Worker | null = null;

export function PerfProvider({ children }: { children: React.ReactNode }) {
  if (!isDev) {
    return <>{children}</>;
  }

  useEffect(() => {
    try {
      worker = createAnalyzerWorker();

      // Initialize worker with rules
      const rules = getRulesConfig();
      worker.postMessage({
        type: "INIT_RULES",
        payload: rules,
      });

      console.log(`[PerfGuard] Initialized with ${rules.length} rules`);

      worker.onmessage = (e) => {
        console.log("[PerfGuard] Analysis results:", e.data.length, "issues");
        e.data
          .filter(Boolean)
          .forEach(showWarning);
      };

      worker.onerror = (err) => {
        console.error("[PerfGuard] Worker error:", err);
      };
    } catch (err) {
      console.warn("[PerfGuard] Worker failed to start", err);
      return;
    }

    const interval = setInterval(() => {
      const data = flushMetrics();
      if (data.length) {
        console.log("[PerfGuard] Flushing metrics:", data.length, "snapshots");
        worker?.postMessage({
          type: "EVALUATE",
          payload: data,
        });
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      worker?.terminate();
      worker = null;
    };
  }, []);

  return <>{children}</>;
}

