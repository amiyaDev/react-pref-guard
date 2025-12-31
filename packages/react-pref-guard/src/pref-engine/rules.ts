// rules.ts - Pure data, no functions
export interface RulePredicate {
  field: "avgTime" | "maxTime" | "renders";
  operator: ">" | "<" | ">=" | "<=" | "===";
  value: number;
}

export interface RuleRegression {
  field: "avgTime" | "maxTime";
  multiplier: number;
}

export interface PerfRule {
  id: string;
  category: "PERFORMANCE" | "MEMORY" | "RELIABILITY";
  baseSeverity: "HIGH" | "MEDIUM" | "LOW";
  predicate?: RulePredicate;
  regression?: RuleRegression;
  confidenceThreshold?: number;
  // Message templates (interpolated by worker)
  messageTemplate: string;
  messageFields?: string[]; // Fields to interpolate
}

export const PERF_RULES: PerfRule[] = [
  {
    id: "SLOW_RENDER",
    category: "PERFORMANCE",
    baseSeverity: "HIGH",
    predicate: {
      field: "avgTime",
      operator: ">",
      value: 16,
    },
    confidenceThreshold: 0.6,
    messageTemplate: "Average render time exceeded 16ms in {confidence}% of recent batches",
    messageFields: ["confidence"],
  },

  {
    id: "EXCESSIVE_RENDERS",
    category: "PERFORMANCE",
    baseSeverity: "MEDIUM",
    predicate: {
      field: "renders",
      operator: ">",
      value: 20,
    },
    confidenceThreshold: 0.6,
    messageTemplate: "Component rendered excessively in {confidence}% of recent batches",
    messageFields: ["confidence"],
  },

  {
    id: "PERF_REGRESSION",
    category: "PERFORMANCE",
    baseSeverity: "HIGH",
    regression: {
      field: "avgTime",
      multiplier: 1.3,
    },
    messageTemplate: "Avg render time increased from {prevValue}ms to {currValue}ms",
    messageFields: ["prevValue", "currValue"],
  },

  {
    id: "VERY_SLOW_RENDER",
    category: "PERFORMANCE",
    baseSeverity: "HIGH",
    predicate: {
      field: "avgTime",
      operator: ">",
      value: 50,
    },
    confidenceThreshold: 0.5,
    messageTemplate: "Critical: render time exceeded 50ms in {confidence}% of batches",
    messageFields: ["confidence"],
  },
];

// Export for runtime config (CI, experiments, per-team)
export function getRulesConfig(): PerfRule[] {
  // Could load from env, API, localStorage, etc.
  return PERF_RULES;
}