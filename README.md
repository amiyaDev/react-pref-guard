
# ⚡ React Pref Guard (PerfGuard)

A developer-first performance guardrail for **React & Next.js** applications.

Pref Guard continuously monitors how your components render during development and automatically detects performance problems, regressions, and UX issues — before they reach production.

---

## ✨ What is Pref Guard?

Pref Guard (Performance Guard) is a **development-only runtime performance analysis tool** for React.

It observes real renders, applies a rule engine, and reports actionable performance issues with confidence scoring, trend detection, and noise suppression.

Unlike traditional profilers, Pref Guard runs continuously and automatically while you build features.

---

## ❓ What problem does Pref Guard solve?

### The problem today
- React DevTools Profiler is manual
- Lighthouse runs after performance is already bad
- Performance regressions silently slip in
- Console logs are noisy and repetitive
- Teams ship UX regressions unknowingly

### What Pref Guard does differently

| Traditional Tools | Pref Guard |
|------------------|------------|
| Manual profiling | Automatic detection |
| One-time snapshots | Continuous monitoring |
| Raw numbers | Rule-based insights |
| Console spam | Deduplicated, structured issues |
| No history | Regression + trend detection |

**Pref Guard makes performance a first-class development signal.**

---

## 🔑 Key Features

- Automatic performance detection
- Regression & trend analysis
- Confidence-based rule engine
- Boundary-aware severity tuning
- Noise-free reporting
- Visual PerfGuard Panel
- Dev-only, production-safe

---

## 🧱 How Pref Guard Works

React Profiler  
→ Metric Collector  
→ Analyzer Worker (Rules Engine)  
→ Issue Reporter  
→ PerfGuard Panel + Alerts

Heavy analysis runs in a Web Worker to avoid UI blocking.

---

## 📦 Installation

```bash
npm install react-pref-guard
# or
pnpm add react-pref-guard
```

---

## 🚀 Quick Start (React)

### 1️⃣ Wrap your app

```tsx
import { PerfProvider } from "react-pref-guard";

export function App() {
  return (
    <PerfProvider>
      <YourApp />
    </PerfProvider>
  );
}
```

Pref Guard disables itself automatically in production.

---

### 2️⃣ (Optional) Wrap heavy components

```tsx
import { withPerfGuard } from "react-pref-guard";

function HeavyComponent() {
  return <div>Expensive UI</div>;
}

export default withPerfGuard(HeavyComponent);
```

---

## 🖥️ PerfGuard Panel

The PerfGuard Panel appears automatically in development and shows:
- All detected issues
- Severity (LOW → CRITICAL)
- Confidence score
- Active vs Resolved lifecycle
- Component name and rule

It acts as the **single source of truth** for performance issues.

---

## 🚨 Critical Alerts

Critical issues:
- Show a visual overlay
- Are logged once per lifecycle
- Are also stored and shown in the panel

---

## 🎯 Boundary Types

| Boundary | Meaning |
|--------|---------|
| INLINE | Small child component |
| HOC | Wrapped or logical boundary |
| PAGE | Route-level component |

Inline components are softened automatically to reduce noise.

---

## 🔒 Production Safety

- Disabled automatically in production
- No workers, no profiler, no overhead
- Safe to deploy

---

# ⚡ Using Pref Guard with Next.js

Pref Guard works with both **Pages Router** and **App Router**.

> Client-only, SSR-safe, RSC-safe

---

## Next.js – Pages Router

### Wrap `_app.tsx`

```tsx
import type { AppProps } from "next/app";
import { PerfProvider } from "react-pref-guard";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <PerfProvider>
      <Component {...pageProps} />
    </PerfProvider>
  );
}
```

---

## Next.js – App Router

### Create provider

```tsx
"use client";
import { PerfProvider } from "react-pref-guard";

export function Providers({ children }) {
  return <PerfProvider>{children}</PerfProvider>;
}
```

### Use in layout

```tsx
import { Providers } from "./providers";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## 🧪 Testing

```tsx
"use client";

export function SlowComponent() {
  const start = performance.now();
  while (performance.now() - start < 120) {}
  return <div>Slow render</div>;
}
```

Use this component and observe the PerfGuard Panel.

---

## 🛣️ Roadmap

- React Router auto integration
- Next.js preset
- CI performance gates
- Exportable reports
- Rule customization

---

## 📄 License

MIT

---

## ⭐ Final Note

Performance should fail **early**, **clearly**, and **with context**.

Pref Guard makes performance a daily habit — not a late-stage fire drill.
