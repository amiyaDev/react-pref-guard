// TestWrapper.tsx
import { PerfProfiler } from "react-pref-guard";

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
