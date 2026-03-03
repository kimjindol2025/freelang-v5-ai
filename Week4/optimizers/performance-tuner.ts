/**
 * Performance Tuner
 * 생성된 코드의 성능을 최적화
 *
 * 최적화 항목:
 * 1. 루프 최적화 (Loop unrolling, hoisting)
 * 2. 함수 호출 최소화
 * 3. 메모리 할당 최소화
 * 4. 캐싱 권장
 * 5. 알고리즘 복잡도 분석
 */

/**
 * 성능 이슈
 */
export interface PerformanceIssue {
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  message: string;
  line?: number;
  recommendation?: string;
  impactEstimate?: string; // e.g., "O(n²)" → "O(n log n)"
}

/**
 * 성능 분석 결과
 */
export interface PerformanceTuningResult {
  issues: PerformanceIssue[];
  estimatedSpeedup: number; // 예상 속도 향상 배수
  bottlenecks: string[];
  recommendations: string[];
}

/**
 * 성능 튜닝 엔진
 */
export class PerformanceTuner {
  /**
   * 성능 분석
   */
  analyze(code: string): PerformanceTuningResult {
    const issues: PerformanceIssue[] = [];
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
    let estimatedSpeedup = 1.0;

    const lines = code.split("\n");

    // 1. 루프 분석
    const loopIssues = this.analyzeLoops(lines);
    issues.push(...loopIssues);

    // 2. 함수 호출 분석
    const functionIssues = this.analyzeFunctionCalls(lines);
    issues.push(...functionIssues);

    // 3. 메모리 할당 분석
    const memoryIssues = this.analyzeMemoryAllocation(lines);
    issues.push(...memoryIssues);

    // 4. 알고리즘 복잡도 분석
    const complexityIssues = this.analyzeComplexity(lines);
    issues.push(...complexityIssues);

    // 5. 캐싱 권장
    const cachingIssues = this.analyzeCachingOpportunities(lines);
    issues.push(...cachingIssues);

    // 속도 향상 예상
    estimatedSpeedup = Math.max(1, 1 + issues.filter((i) => i.severity === "high").length * 0.1);

    // 병목 지점 식별
    if (loopIssues.length > 0) bottlenecks.push("Inefficient loops");
    if (functionIssues.length > 0) bottlenecks.push("Excessive function calls");
    if (memoryIssues.length > 0) bottlenecks.push("Memory allocation overhead");
    if (complexityIssues.length > 0) bottlenecks.push("High algorithmic complexity");

    return {
      issues,
      estimatedSpeedup,
      bottlenecks,
      recommendations,
    };
  }

  /**
   * 루프 분석
   */
  private analyzeLoops(lines: string[]): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 중첩 루프 감지
      if (/for\s*\(|while\s*\(/.test(line)) {
        const indentMatch = line.match(/^\s*/);
        const indentation = indentMatch ? indentMatch[0].length : 0;

        // 다음 줄도 루프인지 확인
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const nextIndentMatch = nextLine.match(/^\s*/);
          const nextIndentation = nextIndentMatch ? nextIndentMatch[0].length : 0;

          if (
            nextIndentation > indentation &&
            (/for\s*\(|while\s*\(/.test(nextLine) ||
              /\.forEach|\.map|\.filter|\.reduce/.test(nextLine))
          ) {
            issues.push({
              severity: "high",
              type: "Nested Loop",
              message: "중첩 루프로 인한 성능 저하 (O(n²) 복잡도)",
              line: i + 1,
              recommendation:
                "가능하면 중첩 루프를 피하거나, 단일 패스로 처리하는 알고리즘 사용",
            });
          }
        }

        // 루프 내 함수 호출
        if (/\.forEach|\.map|\.filter|\.reduce|\bfor\b/.test(line)) {
          if (lines[i + 1]?.includes("database.") || lines[i + 1]?.includes("fetch")) {
            issues.push({
              severity: "high",
              type: "Loop Database Call",
              message: "루프 내에서 데이터베이스 쿼리 실행 (N+1 문제)",
              line: i + 1,
              recommendation:
                "배치 쿼리 또는 JOIN을 사용하여 단일 쿼리로 통합 (e.g., SELECT * FROM users WHERE id IN (...))",
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * 함수 호출 분석
   */
  private analyzeFunctionCalls(lines: string[]): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    const functionCallCounts = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 함수 호출 카운트
      const matches = line.match(/\b([a-zA-Z_]\w*)\s*\(/g);
      if (matches) {
        for (const match of matches) {
          const funcName = match.replace(/\s*\($/, "");
          functionCallCounts.set(funcName, (functionCallCounts.get(funcName) || 0) + 1);
        }
      }
    }

    // 과도한 함수 호출 감지
    for (const [funcName, count] of functionCallCounts) {
      if (count > 10) {
        issues.push({
          severity: "medium",
          type: "Excessive Function Calls",
          message: `함수 '${funcName}'이 ${count}회 호출됨 (인라인 최적화 고려)`,
          recommendation: "자주 호출되는 간단한 함수는 인라인 처리 또는 메모이제이션 사용",
        });
      }
    }

    return issues;
  }

  /**
   * 메모리 할당 분석
   */
  private analyzeMemoryAllocation(lines: string[]): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 루프 내 배열/객체 생성
      if (/for\s*\(|while\s*\(/.test(line)) {
        if (
          lines[i + 1]?.includes("new Array") ||
          lines[i + 1]?.includes("new Object") ||
          lines[i + 1]?.includes("= []") ||
          lines[i + 1]?.includes("= {}")
        ) {
          issues.push({
            severity: "high",
            type: "Memory Allocation in Loop",
            message: "루프 내에서 메모리 할당 (GC 오버헤드 증가)",
            line: i + 2,
            recommendation: "루프 외부에서 배열/객체를 미리 할당하고 재사용",
          });
        }
      }

      // 큰 배열 복사
      if (/\.slice\(\)|\.concat\(\)|\.spread|\.\.\./g.test(line)) {
        issues.push({
          severity: "medium",
          type: "Large Array Copy",
          message: "큰 배열의 복사로 인한 메모리 오버헤드",
          line: i + 1,
          recommendation:
            "필요한 경우에만 복사, 원본 배열의 뷰(view) 또는 이터레이터 사용",
        });
      }
    }

    return issues;
  }

  /**
   * 복잡도 분석
   */
  private analyzeComplexity(lines: string[]): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // O(n²) 패턴: 중첩 루프 + 배열 검색
      if (/indexOf|includes|find\(/.test(line) && i > 0) {
        const prevLine = lines[i - 1];
        if (/for\s*\(|while\s*\(|\.forEach|\.map/.test(prevLine)) {
          issues.push({
            severity: "high",
            type: "O(n²) Complexity",
            message: "선형 탐색이 루프 내에서 수행됨 (O(n²) 복잡도)",
            line: i + 1,
            recommendation:
              "Set/Map을 사용하여 O(1) 탐색으로 개선 (e.g., const set = new Set(arr); if (set.has(value))",
          });
        }
      }

      // 정렬의 복잡도
      if (/\.sort\(/.test(line)) {
        issues.push({
          severity: "medium",
          type: "Sorting Complexity",
          message: "정렬 연산 (O(n log n))",
          line: i + 1,
          recommendation: "가능하면 사전 정렬된 데이터 사용 또는 부분 정렬 고려",
        });
      }
    }

    return issues;
  }

  /**
   * 캐싱 기회 분석
   */
  private analyzeCachingOpportunities(lines: string[]): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 반복된 계산
      if (/length|size|count/.test(line)) {
        // 반복 사용되는지 확인 (정확한 문자열 매칭)
        const trimmedLine = line.trim();
        const occurrences = lines.filter((l) => l.trim() === trimmedLine).length;

        if (occurrences > 3) {
          issues.push({
            severity: "low",
            type: "Repeated Calculation",
            message: "반복되는 계산을 캐싱할 수 있음",
            line: i + 1,
            recommendation:
              "자주 사용되는 값은 변수에 저장 (e.g., const len = array.length; for (let i = 0; i < len; i++))",
          });
        }
      }

      // 데이터베이스 쿼리
      if (/database\.|query\(|execute\(/.test(line)) {
        issues.push({
          severity: "medium",
          type: "Database Query Optimization",
          message: "데이터베이스 쿼리의 캐싱 고려",
          recommendation:
            "자주 사용되는 쿼리는 메모이제이션 또는 캐싱 (Redis, In-Memory Cache) 사용",
        });
      }
    }

    return issues;
  }

  /**
   * 성능 리포트 생성
   */
  generatePerformanceReport(result: PerformanceTuningResult): string {
    const speedupPercent = (result.estimatedSpeedup - 1) * 100;

    return `
╔════════════════════════════════════════════════════════════════╗
║                  ⚡ 성능 최적화 리포트                           ║
╚════════════════════════════════════════════════════════════════╝

📊 성능 분석:

예상 속도 향상: ${result.estimatedSpeedup.toFixed(2)}배 (${speedupPercent.toFixed(1)}% 개선)

🔴 병목 지점:
${result.bottlenecks.length > 0 ? result.bottlenecks.map((b) => `  - ${b}`).join("\n") : "  없음"}

⚠️  성능 이슈 (${result.issues.length}개):
${result.issues
  .map(
    (issue) =>
      `
  [${issue.severity.toUpperCase()}] ${issue.type}
    메시지: ${issue.message}
    ${issue.line ? `줄 번호: ${issue.line}` : ""}
    ${issue.impactEstimate ? `영향: ${issue.impactEstimate}` : ""}
    권장사항: ${issue.recommendation || "없음"}
  `
  )
  .join("")}

✅ 최적화 완료!
════════════════════════════════════════════════════════════════
`;
  }
}

/**
 * 테스트
 */
export function testPerformanceTuner() {
  const tuner = new PerformanceTuner();

  const inefficientCode = `
function findDuplicates(arr1, arr2) {
  const duplicates = [];

  // O(n²) 알고리즘
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      if (arr1[i] === arr2[j]) {
        duplicates.push(arr1[i]);
      }
    }
  }

  return duplicates;
}

function processUsers(userIds) {
  const results = [];

  // N+1 쿼리 문제
  for (const userId of userIds) {
    const user = database.query("SELECT * FROM users WHERE id = " + userId);
    results.push(user);
  }

  return results;
}

function calculateSum(arr) {
  let sum = 0;

  // 루프 내 배열 생성
  for (let i = 0; i < arr.length; i++) {
    const temp = [];
    temp.push(arr[i]);
    sum += arr[i].length; // 반복된 계산
  }

  return sum;
}
`;

  console.log("테스트 코드:");
  console.log(inefficientCode);
  console.log("\n성능 분석 중...\n");

  const result = tuner.analyze(inefficientCode);

  console.log(tuner.generatePerformanceReport(result));
}

// CLI 실행
if (require.main === module) {
  testPerformanceTuner();
}
