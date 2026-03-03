/**
 * AST Optimizer
 * 생성된 코드의 추상 구문 트리를 최적화
 *
 * 최적화 규칙:
 * 1. Dead-code 제거 (사용하지 않는 코드)
 * 2. Constant folding (상수 연산 미리 계산)
 * 3. 중복 코드 제거 (같은 로직 통합)
 */

/**
 * AST 노드 타입
 */
export interface ASTNode {
  type: string;
  value?: any;
  children?: ASTNode[];
  metadata?: Record<string, any>;
}

export interface OptimizationResult {
  original: string;
  optimized: string;
  reductionPercent: number;
  optimizationsApplied: string[];
}

/**
 * AST 최적화 엔진
 */
export class ASTOptimizer {
  private unusedVariables: Set<string> = new Set();
  private constantValues: Map<string, any> = new Map();
  private duplicateBlocks: Map<string, string[]> = new Map();

  /**
   * 전체 코드 최적화 (문자열 기반)
   */
  optimize(code: string): OptimizationResult {
    const originalLength = code.length;
    const lines = code.split("\n");

    // 1. 미사용 변수 분석
    this.analyzeUnusedVariables(lines);

    // 2. Dead-code 제거
    let optimized = this.removeDeadCode(lines).join("\n");

    // 3. 상수 폴딩
    optimized = this.foldConstants(optimized);

    // 4. 중복 코드 제거
    optimized = this.removeDuplicates(optimized);

    // 5. 공백 최적화
    optimized = this.optimizeWhitespace(optimized);

    const optimizedLength = optimized.length;
    const reductionPercent = ((originalLength - optimizedLength) / originalLength) * 100;

    return {
      original: code,
      optimized,
      reductionPercent: Math.round(reductionPercent * 10) / 10,
      optimizationsApplied: [
        "Dead-code removal",
        "Constant folding",
        "Duplicate removal",
        "Whitespace optimization",
      ],
    };
  }

  /**
   * 미사용 변수 분석
   */
  private analyzeUnusedVariables(lines: string[]): void {
    const declared = new Set<string>();
    const used = new Set<string>();

    for (const line of lines) {
      // 변수 선언 찾기 (let, const, var, int, float, etc.)
      const declMatch = line.match(/(?:let|const|var|int|float|string|bool)\s+(\w+)/);
      if (declMatch) {
        declared.add(declMatch[1]);
      }

      // 변수 사용 찾기
      const useMatches = line.matchAll(/\b([a-zA-Z_]\w*)\b/g);
      for (const match of useMatches) {
        used.add(match[1]);
      }
    }

    // 선언되었지만 사용하지 않은 변수
    for (const varName of declared) {
      if (!used.has(varName)) {
        this.unusedVariables.add(varName);
      }
    }
  }

  /**
   * Dead-code 제거
   */
  private removeDeadCode(lines: string[]): string[] {
    return lines.filter((line) => {
      // 미사용 변수 선언 제거
      for (const varName of this.unusedVariables) {
        if (line.includes(`= ${varName}`) || line.includes(` ${varName};`)) {
          return false;
        }
      }

      // 주석 제거는 하지 않음 (가독성)
      // 빈 줄 제거
      if (line.trim() === "") {
        return false;
      }

      return true;
    });
  }

  /**
   * 상수 폴딩 (상수 연산 미리 계산)
   */
  private foldConstants(code: string): string {
    // 간단한 산술 연산 최적화
    // 예: 2 + 3 → 5
    return code
      .replace(/\b(\d+)\s*\+\s*(\d+)\b/g, (match, a, b) => {
        return String(parseInt(a) + parseInt(b));
      })
      .replace(/\b(\d+)\s*\-\s*(\d+)\b/g, (match, a, b) => {
        return String(parseInt(a) - parseInt(b));
      })
      .replace(/\b(\d+)\s*\*\s*(\d+)\b/g, (match, a, b) => {
        return String(parseInt(a) * parseInt(b));
      })
      .replace(/\b(\d+)\s*\/\s*(\d+)\b/g, (match, a, b) => {
        const divisor = parseInt(b);
        if (divisor !== 0) {
          return String(Math.floor(parseInt(a) / divisor));
        }
        return match;
      });
  }

  /**
   * 중복 코드 제거
   */
  private removeDuplicates(code: string): string {
    const lines = code.split("\n");
    const seen = new Set<string>();
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // 빈 줄은 항상 추가 (최대 1개)
      if (trimmed === "") {
        if (!seen.has("")) {
          result.push(line);
          seen.add("");
        }
      } else {
        // 중복 제거 (주석, import/include 제외)
        if (!seen.has(trimmed) || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
          result.push(line);
          seen.add(trimmed);
        }
      }
    }

    return result.join("\n");
  }

  /**
   * 공백 최적화
   */
  private optimizeWhitespace(code: string): string {
    return code
      .split("\n")
      .map((line) => line.trimRight()) // 줄 끝 공백 제거
      .join("\n")
      .replace(/\n{3,}/g, "\n\n") // 3개 이상의 줄바꿈 → 2개로 통합
      .trim(); // 시작/끝 공백 제거
  }

  /**
   * 최적화 가능한 패턴 분석
   */
  analyzeOptimizationOpportunities(code: string): Record<string, number> {
    const opportunities = {
      deadCodeLines: 0,
      constantFoldingOps: 0,
      duplicateLines: 0,
      unusedVariables: this.unusedVariables.size,
    };

    const lines = code.split("\n");
    const seen = new Set<string>();

    for (const line of lines) {
      // 상수 폴딩 기회
      const constantOps = (line.match(/\d+\s*[\+\-\*\/]\s*\d+/g) || []).length;
      opportunities.constantFoldingOps += constantOps;

      // 중복 제거 기회
      const trimmed = line.trim();
      if (seen.has(trimmed) && trimmed !== "") {
        opportunities.duplicateLines++;
      }
      seen.add(trimmed);
    }

    return opportunities;
  }

  /**
   * 최적화 리포트 생성
   */
  generateOptimizationReport(original: string, optimized: string): string {
    const originalLines = original.split("\n").length;
    const optimizedLines = optimized.split("\n").length;
    const reduction = originalLines - optimizedLines;

    return `
╔════════════════════════════════════════════════════════════════╗
║                    🔧 최적화 리포트                              ║
╚════════════════════════════════════════════════════════════════╝

📊 크기 감소:
  원본:    ${original.length} bytes (${originalLines} 줄)
  최적화됨: ${optimized.length} bytes (${optimizedLines} 줄)
  감소:    ${original.length - optimized.length} bytes (${((((original.length - optimized.length) / original.length) * 100).toFixed(1))}%)

📋 줄 수 감소:
  제거된 줄: ${reduction} (${((reduction / originalLines) * 100).toFixed(1)}%)

🔍 분석 결과:
  미사용 변수: ${this.unusedVariables.size}개
  중복 코드: ${this.duplicateBlocks.size}개
  최적화 규칙 적용: 4가지

✅ 최적화 완료!
════════════════════════════════════════════════════════════════
`;
  }
}

/**
 * 테스트
 */
export function testOptimizer() {
  const optimizer = new ASTOptimizer();

  const testCode = `
// 함수 정의
function add(a, b) {
  const unused = 10;
  let sum = a + b;
  let result = 2 + 3;
  return sum;
}

function add(a, b) {
  return a + b;
}

// TODO: 구현 필요
// 빈 줄


// 또 다른 빈 줄
const x = 100;
const y = 100;

export function multiply(a, b) {
  return a * 10;
}
`;

  console.log("원본 코드:");
  console.log(testCode);
  console.log("\n최적화 시작...\n");

  const result = optimizer.optimize(testCode);

  console.log("최적화된 코드:");
  console.log(result.optimized);
  console.log(optimizer.generateOptimizationReport(result.original, result.optimized));
}

// CLI 실행
if (require.main === module) {
  testOptimizer();
}
