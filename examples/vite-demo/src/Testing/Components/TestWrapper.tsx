// TestWrapper.tsx
import { PerfProfiler } from "react-perf-guard";

export function TestWrapper({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <PerfProfiler id={id}>
      {children}
    </PerfProfiler>
  );
}
