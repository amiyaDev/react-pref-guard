// worker/createWorker.ts
export function createAnalyzerWorker() {
  const code = `
    /* ===============================
       PerfGuard – Rule DSL Worker
       =============================== */

    const history = new Map();
    const MAX_HISTORY = 5;
    let RULES = [];

    /* -------------------------------
       Utilities
    -------------------------------- */

    function record(snapshot) {
      const list = history.get(snapshot.component) || [];
      list.push(snapshot);
      if (list.length > MAX_HISTORY) list.shift();
      history.set(snapshot.component, list);
    }

    function calculateConfidence(predicateFn, historyList) {
      if (historyList.length === 0) return 0;
      const matches = historyList.filter(predicateFn).length;
      return matches / historyList.length;
    }

    function downgradeSeverity(severity, confidence, boundaryType) {
      if (boundaryType === "INLINE") return "INFO";
      if (confidence < 0.7) return "LOW";
      if (confidence < 0.85) return "MEDIUM";
      return severity;
    }

    function buildPredicate({ field, operator, value }) {
      switch (operator) {
        case ">": return (s) => s[field] > value;
        case "<": return (s) => s[field] < value;
        case ">=": return (s) => s[field] >= value;
        case "<=": return (s) => s[field] <= value;
        case "===": return (s) => s[field] === value;
        default: return () => false;
      }
    }

    function interpolateMessage(template, values) {
      let result = template;
      for (const [key, value] of Object.entries(values)) {
        result = result.replace(
          new RegExp(\`{\${key}}\`, 'g'),
          typeof value === 'number' ? Math.round(value).toString() : value
        );
      }
      return result;
    }

    /* -------------------------------
       Rule Evaluation Engine
    -------------------------------- */

    function evaluate(snapshot) {
      const issues = [];
      const historyList = history.get(snapshot.component) || [];
      const previous = historyList[historyList.length - 1];

      for (const rule of RULES) {

        /* ----- Regression Rule ----- */
        if (rule.regression && previous) {
          const field = rule.regression.field;
          const multiplier = rule.regression.multiplier;

          if (snapshot[field] > previous[field] * multiplier) {
            const reason = interpolateMessage(rule.messageTemplate, {
              prevValue: previous[field].toFixed(1),
              currValue: snapshot[field].toFixed(1),
            });

            issues.push({
              ruleId: rule.id,
              confidence: 1,
              severity: downgradeSeverity(
                rule.baseSeverity,
                1,
                snapshot.boundaryType || "HOC"
              ),
              reason,
            });
          }
          continue;
        }

        /* ----- Predicate Rule ----- */
        if (rule.predicate) {
          const predicateFn = buildPredicate(rule.predicate);
          const confidence = calculateConfidence(predicateFn, historyList);
          const threshold = rule.confidenceThreshold || 0.6;

          if (predicateFn(snapshot) && confidence >= threshold) {
            const reason = interpolateMessage(rule.messageTemplate, {
              confidence: (confidence * 100).toFixed(0),
            });

            issues.push({
              ruleId: rule.id,
              confidence,
              severity: downgradeSeverity(
                rule.baseSeverity,
                confidence,
                snapshot.boundaryType || "HOC"
              ),
              reason,
            });
          }
        }
      }

      record(snapshot);
      return issues;
    }

    /* -------------------------------
       Worker Message Handler
    -------------------------------- */

    self.onmessage = (e) => {
      const { type, payload } = e.data;

      /* Init rules once */
      if (type === "INIT_RULES") {
        RULES = payload;
        console.log('[PerfGuard Worker] Rules loaded:', RULES.length);
        return;
      }

      /* Evaluate snapshots */
      if (type === "EVALUATE") {
        const results = [];

        for (const snapshot of payload) {
          const issues = evaluate(snapshot);

          if (issues.length) {
            results.push({
              component: snapshot.component,
              boundaryType: snapshot.boundaryType || "HOC",
              metrics: {
                renders: snapshot.renders,
                avgTime: snapshot.avgTime,
                maxTime: snapshot.maxTime,
              },
              issues,
            });
          }
        }

        console.log('[PerfGuard Worker] Evaluation complete:', results.length, 'issues');
        self.postMessage(results);
      }
    };
  `;

  return new Worker(
    URL.createObjectURL(
      new Blob([code], { type: "application/javascript" })
    )
  );
}