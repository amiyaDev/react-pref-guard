import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, XCircle, Play, Trash2, RefreshCw } from 'lucide-react';

// Mock collector and worker for testing
const mockCollector = {
  history: new Map(),
  MAX_HISTORY: 5,
  
  record(snapshot) {
    const list = this.history.get(snapshot.component) || [];
    list.push(snapshot);
    if (list.length > this.MAX_HISTORY) list.shift();
    this.history.set(snapshot.component, list);
  },
  
  clear() {
    this.history.clear();
  }
};

// Test scenarios
const TEST_SCENARIOS = [
  {
    id: 'slow_render_consistent',
    name: 'SLOW_RENDER: Consistent Violations',
    description: 'Component consistently renders over 16ms threshold',
    snapshots: [
      { component: 'SlowComponent', avgTime: 18, maxTime: 25, renders: 5, boundaryType: 'HOC' },
      { component: 'SlowComponent', avgTime: 20, maxTime: 28, renders: 6, boundaryType: 'HOC' },
      { component: 'SlowComponent', avgTime: 19, maxTime: 26, renders: 5, boundaryType: 'HOC' },
      { component: 'SlowComponent', avgTime: 21, maxTime: 30, renders: 7, boundaryType: 'HOC' },
    ],
    expectedIssues: ['SLOW_RENDER'],
    expectedSeverity: 'MEDIUM',
  },
  
  {
    id: 'slow_render_high_confidence',
    name: 'SLOW_RENDER: High Confidence (85%+)',
    description: 'Should trigger HIGH severity with 85%+ confidence',
    snapshots: [
      { component: 'VerySlowComponent', avgTime: 25, maxTime: 35, renders: 5, boundaryType: 'HOC' },
      { component: 'VerySlowComponent', avgTime: 28, maxTime: 38, renders: 6, boundaryType: 'HOC' },
      { component: 'VerySlowComponent', avgTime: 26, maxTime: 36, renders: 5, boundaryType: 'HOC' },
      { component: 'VerySlowComponent', avgTime: 27, maxTime: 37, renders: 7, boundaryType: 'HOC' },
      { component: 'VerySlowComponent', avgTime: 29, maxTime: 39, renders: 8, boundaryType: 'HOC' },
    ],
    expectedIssues: ['SLOW_RENDER', 'VERY_SLOW_RENDER'],
    expectedSeverity: 'HIGH',
  },

  {
    id: 'slow_render_intermittent',
    name: 'SLOW_RENDER: Below Confidence Threshold',
    description: 'Only 40% violations - should NOT trigger',
    snapshots: [
      { component: 'SometimesSlow', avgTime: 18, maxTime: 25, renders: 5, boundaryType: 'HOC' },
      { component: 'SometimesSlow', avgTime: 12, maxTime: 18, renders: 6, boundaryType: 'HOC' },
      { component: 'SometimesSlow', avgTime: 14, maxTime: 20, renders: 5, boundaryType: 'HOC' },
      { component: 'SometimesSlow', avgTime: 10, maxTime: 15, renders: 7, boundaryType: 'HOC' },
      { component: 'SometimesSlow', avgTime: 11, maxTime: 16, renders: 8, boundaryType: 'HOC' },
    ],
    expectedIssues: [],
    expectedSeverity: null,
  },

  {
    id: 'excessive_renders',
    name: 'EXCESSIVE_RENDERS: Too Many Re-renders',
    description: 'Component renders >20 times consistently',
    snapshots: [
      { component: 'ChurningComponent', avgTime: 5, maxTime: 10, renders: 25, boundaryType: 'HOC' },
      { component: 'ChurningComponent', avgTime: 6, maxTime: 11, renders: 28, boundaryType: 'HOC' },
      { component: 'ChurningComponent', avgTime: 5, maxTime: 9, renders: 30, boundaryType: 'HOC' },
      { component: 'ChurningComponent', avgTime: 7, maxTime: 12, renders: 27, boundaryType: 'HOC' },
    ],
    expectedIssues: ['EXCESSIVE_RENDERS'],
    expectedSeverity: 'MEDIUM',
  },

  {
    id: 'perf_regression',
    name: 'PERF_REGRESSION: 30%+ Slowdown',
    description: 'Render time jumps from 10ms to 15ms',
    snapshots: [
      { component: 'RegressingComponent', avgTime: 10, maxTime: 15, renders: 5, boundaryType: 'HOC' },
      { component: 'RegressingComponent', avgTime: 15, maxTime: 20, renders: 5, boundaryType: 'HOC' },
    ],
    expectedIssues: ['PERF_REGRESSION'],
    expectedSeverity: 'HIGH',
  },

  {
    id: 'inline_boundary_downgrade',
    name: 'INLINE Boundary Severity Downgrade',
    description: 'INLINE boundaries should downgrade to INFO',
    snapshots: [
      { component: 'InlineComponent', avgTime: 25, maxTime: 35, renders: 5, boundaryType: 'INLINE' },
      { component: 'InlineComponent', avgTime: 28, maxTime: 38, renders: 6, boundaryType: 'INLINE' },
      { component: 'InlineComponent', avgTime: 26, maxTime: 36, renders: 5, boundaryType: 'INLINE' },
      { component: 'InlineComponent', avgTime: 27, maxTime: 37, renders: 7, boundaryType: 'INLINE' },
    ],
    expectedIssues: ['SLOW_RENDER'],
    expectedSeverity: 'INFO',
  },

  {
    id: 'multiple_rules_triggered',
    name: 'Multiple Rules: Slow + Excessive',
    description: 'Component triggers both SLOW_RENDER and EXCESSIVE_RENDERS',
    snapshots: [
      { component: 'BadComponent', avgTime: 20, maxTime: 30, renders: 25, boundaryType: 'HOC' },
      { component: 'BadComponent', avgTime: 22, maxTime: 32, renders: 28, boundaryType: 'HOC' },
      { component: 'BadComponent', avgTime: 21, maxTime: 31, renders: 30, boundaryType: 'HOC' },
      { component: 'BadComponent', avgTime: 23, maxTime: 33, renders: 27, boundaryType: 'HOC' },
    ],
    expectedIssues: ['SLOW_RENDER', 'EXCESSIVE_RENDERS'],
    expectedSeverity: 'MEDIUM',
  },

  {
    id: 'edge_case_single_snapshot',
    name: 'Edge Case: Single Snapshot',
    description: 'First render - no history for confidence',
    snapshots: [
      { component: 'NewComponent', avgTime: 25, maxTime: 35, renders: 5, boundaryType: 'HOC' },
    ],
    expectedIssues: [],
    expectedSeverity: null,
  },

  {
    id: 'edge_case_zero_values',
    name: 'Edge Case: Zero/Near-Zero Values',
    description: 'Component with 0ms render time',
    snapshots: [
      { component: 'FastComponent', avgTime: 0, maxTime: 0, renders: 1, boundaryType: 'HOC' },
      { component: 'FastComponent', avgTime: 0.1, maxTime: 0.2, renders: 1, boundaryType: 'HOC' },
    ],
    expectedIssues: [],
    expectedSeverity: null,
  },

  {
    id: 'edge_case_regression_improvement',
    name: 'Edge Case: Performance Improvement',
    description: 'Render time decreases - should NOT trigger regression',
    snapshots: [
      { component: 'ImprovingComponent', avgTime: 20, maxTime: 30, renders: 5, boundaryType: 'HOC' },
      { component: 'ImprovingComponent', avgTime: 10, maxTime: 15, renders: 5, boundaryType: 'HOC' },
    ],
    expectedIssues: [],
    expectedSeverity: null,
  },

  {
    id: 'stress_test_many_components',
    name: 'Stress Test: 50 Components',
    description: 'Test worker can handle large batches',
    snapshots: Array.from({ length: 50 }, (_, i) => ({
      component: `Component${i}`,
      avgTime: 10 + (i % 10),
      maxTime: 15 + (i % 10),
      renders: 5 + (i % 5),
      boundaryType: 'HOC'
    })),
    expectedIssues: [],
    expectedSeverity: null,
  },
];

// Rules definition (matching your rules.ts)
const PERF_RULES = [
  {
    id: "SLOW_RENDER",
    category: "PERFORMANCE",
    baseSeverity: "HIGH",
    predicate: { field: "avgTime", operator: ">", value: 16 },
    confidenceThreshold: 0.6,
    messageTemplate: "Average render time exceeded 16ms in {confidence}% of recent batches",
  },
  {
    id: "EXCESSIVE_RENDERS",
    category: "PERFORMANCE",
    baseSeverity: "MEDIUM",
    predicate: { field: "renders", operator: ">", value: 20 },
    confidenceThreshold: 0.6,
    messageTemplate: "Component rendered excessively in {confidence}% of recent batches",
  },
  {
    id: "PERF_REGRESSION",
    category: "PERFORMANCE",
    baseSeverity: "HIGH",
    regression: { field: "avgTime", multiplier: 1.3 },
    messageTemplate: "Avg render time increased from {prevValue}ms to {currValue}ms",
  },
  {
    id: "VERY_SLOW_RENDER",
    category: "PERFORMANCE",
    baseSeverity: "HIGH",
    predicate: { field: "avgTime", operator: ">", value: 50 },
    confidenceThreshold: 0.5,
    messageTemplate: "Critical: render time exceeded 50ms in {confidence}% of batches",
  },
];

// Create worker inline
function createTestWorker() {
  const code = `
    const history = new Map();
    const MAX_HISTORY = 5;
    let RULES = [];

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

    function evaluate(snapshot) {
      const issues = [];
      const historyList = history.get(snapshot.component) || [];
      const previous = historyList[historyList.length - 1];

      for (const rule of RULES) {
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
              severity: downgradeSeverity(rule.baseSeverity, 1, snapshot.boundaryType || "HOC"),
              reason,
            });
          }
          continue;
        }

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
              severity: downgradeSeverity(rule.baseSeverity, confidence, snapshot.boundaryType || "HOC"),
              reason,
            });
          }
        }
      }

      record(snapshot);
      return issues;
    }

    self.onmessage = (e) => {
      const { type, payload } = e.data;

      if (type === "INIT_RULES") {
        RULES = payload;
        return;
      }

      if (type === "EVALUATE") {
        const results = [];
        for (const snapshot of payload) {
          const issues = evaluate(snapshot);
          if (issues.length) {
            results.push({
              component: snapshot.component,
              boundaryType: snapshot.boundaryType || "HOC",
              metrics: { renders: snapshot.renders, avgTime: snapshot.avgTime, maxTime: snapshot.maxTime },
              issues,
            });
          }
        }
        self.postMessage(results);
      }

      if (type === "RESET") {
        history.clear();
        self.postMessage({ type: "RESET_COMPLETE" });
      }
    };
  `;

  return new Worker(URL.createObjectURL(new Blob([code], { type: "application/javascript" })));
}

export default function PerfGuardTestHarness() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = createTestWorker();
    workerRef.current.postMessage({ type: "INIT_RULES", payload: PERF_RULES });

    workerRef.current.onmessage = (e) => {
      if (e.data.type === "RESET_COMPLETE") return;
      
      setResults(prev => {
        const newResults = [...prev];
        const lastResult = newResults[newResults.length - 1];
        if (lastResult && lastResult.status === 'running') {
          lastResult.status = 'complete';
          lastResult.actualIssues = e.data;
          lastResult.passed = validateResult(lastResult);
        }
        return newResults;
      });
    };

    return () => workerRef.current?.terminate();
  }, []);

  const validateResult = (result) => {
    const { scenario, actualIssues } = result;
    const actualRuleIds = actualIssues.flatMap(r => r.issues.map(i => i.ruleId));
    
    // Check if expected issues match
    const expectedSet = new Set(scenario.expectedIssues);
    const actualSet = new Set(actualRuleIds);
    
    const issuesMatch = 
      expectedSet.size === actualSet.size &&
      [...expectedSet].every(id => actualSet.has(id));

    // Check severity if expected
    let severityMatch = true;
    if (scenario.expectedSeverity && actualIssues.length > 0) {
      const actualSeverities = actualIssues.flatMap(r => r.issues.map(i => i.severity));
      severityMatch = actualSeverities.some(s => s === scenario.expectedSeverity);
    }

    return issuesMatch && severityMatch;
  };

  const runTest = async (scenario) => {
    setResults(prev => [...prev, {
      scenario,
      status: 'running',
      timestamp: new Date().toISOString(),
      actualIssues: [],
      passed: false,
    }]);

    // Reset worker state
    workerRef.current.postMessage({ type: "RESET" });
    
    // Wait a bit for reset
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send snapshots sequentially
    for (const snapshot of scenario.snapshots) {
      workerRef.current.postMessage({
        type: "EVALUATE",
        payload: [snapshot],
      });
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  const runAllTests = async () => {
    setRunning(true);
    setResults([]);
    
    for (const scenario of TEST_SCENARIOS) {
      await runTest(scenario);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setRunning(false);
  };

  const clearResults = () => {
    setResults([]);
    setSelectedTest(null);
  };

  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => r.status === 'complete' && !r.passed).length;
  const passRate = results.length ? ((passedTests / results.length) * 100).toFixed(0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2">
            🛡️ PerfGuard Rule Engine Test Harness
          </h1>
          <p className="text-slate-400">
            Comprehensive E2E testing for all rules, edge cases, and severity logic
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Total Tests</div>
            <div className="text-3xl font-bold text-white">{TEST_SCENARIOS.length}</div>
          </div>
          <div className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-700/50">
            <div className="text-emerald-400 text-sm mb-1">Passed</div>
            <div className="text-3xl font-bold text-emerald-400">{passedTests}</div>
          </div>
          <div className="bg-red-900/20 rounded-lg p-4 border border-red-700/50">
            <div className="text-red-400 text-sm mb-1">Failed</div>
            <div className="text-3xl font-bold text-red-400">{failedTests}</div>
          </div>
          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/50">
            <div className="text-blue-400 text-sm mb-1">Pass Rate</div>
            <div className="text-3xl font-bold text-blue-400">{passRate}%</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={runAllTests}
            disabled={running}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {running ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {running ? 'Running Tests...' : 'Run All Tests'}
          </button>
          <button
            onClick={clearResults}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            Clear Results
          </button>
        </div>

        {/* Test List */}
        <div className="grid gap-4">
          {TEST_SCENARIOS.map((scenario, idx) => {
            const result = results.find(r => r.scenario.id === scenario.id);
            const status = result?.status || 'pending';
            const passed = result?.passed;

            return (
              <div
                key={scenario.id}
                className={`bg-slate-800/50 backdrop-blur-sm rounded-lg border transition-all cursor-pointer ${
                  status === 'complete'
                    ? passed
                      ? 'border-emerald-700/50 hover:border-emerald-600'
                      : 'border-red-700/50 hover:border-red-600'
                    : status === 'running'
                    ? 'border-blue-700/50 animate-pulse'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
                onClick={() => setSelectedTest(selectedTest === idx ? null : idx)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {status === 'complete' ? (
                          passed ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          )
                        ) : status === 'running' ? (
                          <RefreshCw className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-white">{scenario.name}</h3>
                      </div>
                      <p className="text-slate-400 text-sm ml-8">{scenario.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          runTest(scenario);
                        }}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                      >
                        Run
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedTest === idx && (
                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                      <div>
                        <div className="text-xs font-medium text-slate-400 mb-2">EXPECTED</div>
                        <div className="flex gap-2 flex-wrap">
                          {scenario.expectedIssues.length > 0 ? (
                            scenario.expectedIssues.map(issue => (
                              <span key={issue} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                                {issue}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded italic">
                              No issues expected
                            </span>
                          )}
                          {scenario.expectedSeverity && (
                            <span className={`px-2 py-1 text-xs rounded ${
                              scenario.expectedSeverity === 'HIGH' ? 'bg-red-900/30 text-red-400' :
                              scenario.expectedSeverity === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-blue-900/30 text-blue-400'
                            }`}>
                              Severity: {scenario.expectedSeverity}
                            </span>
                          )}
                        </div>
                      </div>

                      {result && result.actualIssues.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-slate-400 mb-2">ACTUAL RESULTS</div>
                          {result.actualIssues.map((componentResult, i) => (
                            <div key={i} className="bg-slate-900/50 rounded p-3 space-y-2">
                              <div className="text-sm font-medium text-white">
                                {componentResult.component}
                              </div>
                              {componentResult.issues.map((issue, j) => (
                                <div key={j} className="ml-4 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-300 font-medium">{issue.ruleId}</span>
                                    <span className={`px-2 py-0.5 rounded ${
                                      issue.severity === 'HIGH' ? 'bg-red-900/30 text-red-400' :
                                      issue.severity === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-400' :
                                      issue.severity === 'LOW' ? 'bg-blue-900/30 text-blue-400' :
                                      'bg-slate-700 text-slate-400'
                                    }`}>
                                      {issue.severity}
                                    </span>
                                    <span className="text-slate-500">
                                      {(issue.confidence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <div className="text-slate-400 mt-1">{issue.reason}</div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <div className="text-xs font-medium text-slate-400 mb-2">
                          TEST SNAPSHOTS ({scenario.snapshots.length})
                        </div>
                        <div className="bg-slate-900/50 rounded p-2 max-h-40 overflow-y-auto">
                          <pre className="text-xs text-slate-400">
                            {JSON.stringify(scenario.snapshots, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}