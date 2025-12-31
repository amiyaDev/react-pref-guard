import React, { useEffect, useMemo, useState } from "react";
import { withPerfGuard, PerfProfiler } from "react-pref-guard";

/* ======================================================
   1️⃣ FAST COMPONENT (CONTROL – MUST NEVER WARN)
====================================================== */
function FastComponent() {
  return <p>✅ FastComponent (no warnings expected)</p>;
}
const GuardedFast = withPerfGuard(FastComponent);

/* ======================================================
   2️⃣ TRUE EXCESSIVE RENDER BOMB
   - Forces 30+ renders in ONE batch window
====================================================== */
function ExcessiveRenderBomb() {
  const [, force] = useState(0);

  useEffect(() => {
    let count = 0;
    const id = setInterval(() => {
      force(v => v + 1);
      count++;
      if (count >= 35) clearInterval(id);
    }, 10); // very fast renders
    return () => clearInterval(id);
  }, []);

  return <p>💣 ExcessiveRenderBomb (renders storm)</p>;
}
const GuardedRenderBomb = withPerfGuard(ExcessiveRenderBomb);

/* ======================================================
   3️⃣ PERSISTENT SLOW RENDER
====================================================== */
function SlowRenderPersistent() {
  const start = performance.now();
  while (performance.now() - start < 25) {}
  return <p>🐢 SlowRenderPersistent</p>;
}
const GuardedSlow = withPerfGuard(SlowRenderPersistent);

/* ======================================================
   4️⃣ MULTI-ISSUE COMPONENT
   - Slow + excessive renders
====================================================== */
function MultiIssueComponent() {
  const [, force] = useState(0);

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      force(v => v + 1);
      i++;
      if (i >= 30) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, []);

  const start = performance.now();
  while (performance.now() - start < 30) {}

  return <p>💥 MultiIssueComponent</p>;
}
const GuardedMulti = withPerfGuard(MultiIssueComponent);

/* ======================================================
   5️⃣ ONE-TIME SPIKE (MUST BE SUPPRESSED)
====================================================== */
function OneTimeSpike() {
  const [ran, setRan] = useState(false);

  if (!ran) {
    const start = performance.now();
    while (performance.now() - start < 40) {}
    setRan(true);
  }

  return <p>⚡ OneTimeSpike (should NOT warn)</p>;
}
const GuardedSpike = withPerfGuard(OneTimeSpike);

/* ======================================================
   6️⃣ REGRESSION TEST
   - Starts fast
   - Becomes slow after 10s
====================================================== */
function RegressionComponent() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(id);
  }, []);

  if (slow) {
    const start = performance.now();
    while (performance.now() - start < 30) {}
  }

  return <p>📉 RegressionComponent</p>;
}
const GuardedRegression = withPerfGuard(RegressionComponent);

/* ======================================================
   7️⃣ INLINE PROFILER (INFO ONLY)
====================================================== */
function InlineProfiledTree() {
  const start = performance.now();
  while (performance.now() - start < 25) {}
  return <p>📦 InlineProfiledTree</p>;
}

/* ======================================================
   MAIN TEST PAGE
====================================================== */
export default function PerfGuardE2ETestPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1>🧪 Pref Guard – End-to-End Rule Engine Test</h1>

      <hr />
      <GuardedFast />

      <hr />
      <GuardedRenderBomb />

      <hr />
      <GuardedSlow />

      <hr />
      <GuardedMulti />

      <hr />
      <GuardedSpike />

      <hr />
      <GuardedRegression />

      <hr />
      <PerfProfiler id="InlineBoundary">
        <InlineProfiledTree />
      </PerfProfiler>
    </div>
  );
}
