// jest.worker.mock.js - CORRECTED VERSION
// This mock simulates Web Worker behavior for testing

class WorkerMock {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = null;
    this.onerror = null;
    this.history = {};
    this.rulesCount = 0;
  }

  postMessage(msg) {
    // Simulate async worker response with setTimeout
    setTimeout(() => {
      if (!this.onmessage) return;
      
      const response = this.processMessage(msg);
      const event = { data: response };
      this.onmessage(event);
    }, 10);
  }

  processMessage(msg) {
    const { type, payload } = msg;

    switch (type) {
      case 'INIT_RULES':
        this.rulesCount = payload?.length || 0;
        return {
          type: 'INIT_SUCCESS',
          count: this.rulesCount,
        };

      case 'EVALUATE':
        return {
          type: 'RESULTS',
          data: this.evaluateSnapshots(payload || []),
        };

      case 'RESET':
        this.history = {};
        return { type: 'RESET_SUCCESS' };

      case 'GET_STATS':
        return {
          type: 'STATS',
          data: {
            componentsTracked: Object.keys(this.history).length,
            totalSnapshots: Object.values(this.history).reduce((sum, arr) => sum + arr.length, 0),
            rulesLoaded: this.rulesCount,
          },
        };

      default:
        return { type: 'UNKNOWN' };
    }
  }

  evaluateSnapshots(snapshots) {
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return [];
    }

    // Group snapshots by component
    const byComponent = {};
    snapshots.forEach(snap => {
      if (!byComponent[snap.component]) {
        byComponent[snap.component] = [];
        if (!this.history[snap.component]) {
          this.history[snap.component] = [];
        }
      }
      byComponent[snap.component].push(snap);
      this.history[snap.component].push(snap);
    });

    const results = [];

    // Evaluate each component's snapshots
    Object.entries(byComponent).forEach(([component, snaps]) => {
      const issues = this.detectIssues(component, snaps);
      
      if (issues.length > 0) {
        results.push({ component, issues });
      }
    });

    return results;
  }

  detectIssues(component, snapshots) {
    const issues = [];
    
    // Need at least 3 snapshots for reliable pattern detection
    if (snapshots.length < 3) {
      return issues;
    }

    const componentHistory = this.history[component] || snapshots;
    const allSnaps = componentHistory.length >= 3 ? componentHistory : snapshots;
    
    // Extract metrics
    const avgTimes = allSnaps.map(s => s.avgTime);
    const maxTimes = allSnaps.map(s => s.maxTime);
    const renderCounts = allSnaps.map(s => s.renders);
    const boundaryType = snapshots[0]?.boundaryType || 'HOC';

    // ========================================
    // 1. SLOW_RENDER Detection (>16ms)
    // ========================================
    const slowCount = avgTimes.filter(t => t > 16).length;
    const slowConfidence = slowCount / allSnaps.length;
    
    if (slowConfidence >= 0.6) {
      const avgAvgTime = avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length;
      const maxAvgTime = Math.max(...avgTimes);
      
      let severity = 'LOW';
      
      // Downgrade for INLINE boundaries
      if (boundaryType === 'INLINE') {
        severity = 'INFO';
      } 
      // Upgrade based on confidence
      else if (slowConfidence >= 0.8) {
        severity = 'MEDIUM';
      }
      
      issues.push({
        ruleId: 'SLOW_RENDER',
        severity,
        confidence: slowConfidence,
        message: `Component renders slowly (avg: ${avgAvgTime.toFixed(2)}ms, max: ${maxAvgTime.toFixed(2)}ms)`,
        details: {
          avgTime: avgAvgTime,
          maxTime: maxAvgTime,
          threshold: 16,
        }
      });
    }

    // ========================================
    // 2. VERY_SLOW_RENDER Detection (>50ms)
    // ========================================
    const verySlowCount = avgTimes.filter(t => t > 50).length;
    const verySlowConfidence = verySlowCount / allSnaps.length;
    
    if (verySlowConfidence >= 0.6) {
      issues.push({
        ruleId: 'VERY_SLOW_RENDER',
        severity: boundaryType === 'INLINE' ? 'LOW' : 'HIGH',
        confidence: verySlowConfidence,
        message: `Component renders very slowly (>${50}ms)`,
      });
    }

    // ========================================
    // 3. BLOCKING_RENDER Detection (>100ms)
    // ========================================
    const blockingCount = avgTimes.filter(t => t > 100).length;
    const blockingConfidence = blockingCount / allSnaps.length;
    
    if (blockingConfidence >= 0.6) {
      issues.push({
        ruleId: 'BLOCKING_RENDER',
        severity: 'CRITICAL',
        confidence: blockingConfidence,
        message: `Component blocks main thread (>${100}ms)`,
      });
    }

    // ========================================
    // 4. EXCESSIVE_RENDERS Detection (>20)
    // ========================================
    const excessiveCount = renderCounts.filter(r => r > 20).length;
    const excessiveConfidence = excessiveCount / allSnaps.length;
    
    if (excessiveConfidence >= 0.6) {
      const avgRenders = renderCounts.reduce((a, b) => a + b, 0) / renderCounts.length;
      
      issues.push({
        ruleId: 'EXCESSIVE_RENDERS',
        severity: 'MEDIUM',
        confidence: excessiveConfidence,
        message: `Component re-renders excessively (avg: ${avgRenders.toFixed(0)} renders)`,
        details: {
          avgRenders,
          threshold: 20,
        }
      });
    }

    // ========================================
    // 5. SUSPICIOUS_RENDER_LOOP (>100 renders)
    // ========================================
    const loopCount = renderCounts.filter(r => r >= 100).length;
    const loopConfidence = loopCount / allSnaps.length;
    
    if (loopConfidence >= 0.6) {
      issues.push({
        ruleId: 'SUSPICIOUS_RENDER_LOOP',
        severity: 'CRITICAL',
        confidence: loopConfidence,
        message: `Possible infinite render loop detected`,
      });
    }

    // ========================================
    // 6. PERF_REGRESSION Detection (30%+)
    // ========================================
    if (allSnaps.length >= 2) {
      const firstAvg = allSnaps[0].avgTime;
      const lastAvg = allSnaps[allSnaps.length - 1].avgTime;
      const regression = (lastAvg - firstAvg) / firstAvg;
      
      if (regression >= 0.3 && lastAvg > firstAvg) {
        issues.push({
          ruleId: 'PERF_REGRESSION',
          severity: 'HIGH',
          confidence: 1,
          message: `Performance degraded by ${(regression * 100).toFixed(0)}% (${firstAvg.toFixed(2)}ms → ${lastAvg.toFixed(2)}ms)`,
          details: {
            baseline: firstAvg,
            current: lastAvg,
            degradation: regression,
          }
        });
      }
    }

    // ========================================
    // 7. SEVERE_PERF_REGRESSION Detection (100%+)
    // ========================================
    if (allSnaps.length >= 2) {
      const firstAvg = allSnaps[0].avgTime;
      const lastAvg = allSnaps[allSnaps.length - 1].avgTime;
      const regression = (lastAvg - firstAvg) / firstAvg;
      
      if (regression >= 1.0 && lastAvg > firstAvg) {
        issues.push({
          ruleId: 'SEVERE_PERF_REGRESSION',
          severity: 'CRITICAL',
          confidence: 1,
          message: `Severe performance regression detected (${(regression * 100).toFixed(0)}%)`,
        });
      }
    }

    // ========================================
    // 8. RENDER_TIME_CREEP Detection (trend)
    // ========================================
    if (allSnaps.length >= 5) {
      const isIncreasing = this.detectTrend(avgTimes, 'increasing');
      if (isIncreasing) {
        const firstHalf = avgTimes.slice(0, Math.floor(avgTimes.length / 2));
        const secondHalf = avgTimes.slice(Math.floor(avgTimes.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const increase = (secondAvg - firstAvg) / firstAvg;
        
        if (increase > 0.2) {
          issues.push({
            ruleId: 'RENDER_TIME_CREEP',
            severity: 'MEDIUM',
            confidence: 0.8,
            message: `Render time gradually increasing`,
          });
        }
      }
    }

    return issues;
  }

  detectTrend(values, direction) {
    if (values.length < 5) return false;
    
    // Simple linear regression to detect trend
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + (x + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (direction === 'increasing') {
      return slope > 0.5; // Positive slope indicates increasing trend
    } else {
      return slope < -0.5; // Negative slope indicates decreasing trend
    }
  }

  terminate() {
    this.onmessage = null;
    this.onerror = null;
    this.history = {};
  }
}

module.exports = WorkerMock;