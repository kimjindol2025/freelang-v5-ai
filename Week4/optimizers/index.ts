/**
 * Week 4 Optimizers Index
 * 모든 최적화 모듈 내보내기
 */

export { ASTOptimizer, OptimizationResult } from "./ast-optimizer";
export { TypeInference, TypeInferenceResult } from "./type-inference";
export { PerformanceTuner, PerformanceTuningResult } from "./performance-tuner";

import { ASTOptimizer } from "./ast-optimizer";
import { TypeInference } from "./type-inference";
import { PerformanceTuner } from "./performance-tuner";

/**
 * 통합 최적화 엔진
 */
export class OptimizationEngine {
  private astOptimizer: ASTOptimizer;
  private typeInference: TypeInference;
  private performanceTuner: PerformanceTuner;

  constructor() {
    this.astOptimizer = new ASTOptimizer();
    this.typeInference = new TypeInference();
    this.performanceTuner = new PerformanceTuner();
  }

  /**
   * 전체 최적화 파이프라인 실행
   */
  optimizeComplete(code: string): {
    optimized: string;
    astResult: any;
    typeResult: any;
    perfResult: any;
  } {
    // Step 1: AST 최적화
    const astResult = this.astOptimizer.optimize(code);
    let optimized = astResult.optimized;

    // Step 2: 타입 강화
    optimized = this.typeInference.strengthenTypes(optimized);
    const typeResult = this.typeInference.inferTypes(optimized);

    // Step 3: 성능 분석
    const perfResult = this.performanceTuner.analyze(optimized);

    return {
      optimized,
      astResult,
      typeResult,
      perfResult,
    };
  }

  /**
   * 단계별 최적화 (AST만)
   */
  optimizeAST(code: string) {
    return this.astOptimizer.optimize(code);
  }

  /**
   * 단계별 최적화 (타입만)
   */
  optimizeTypes(code: string) {
    return this.typeInference.inferTypes(code);
  }

  /**
   * 단계별 최적화 (성능만)
   */
  analyzePerformance(code: string) {
    return this.performanceTuner.analyze(code);
  }

  /**
   * 최적화 엔진 report
   */
  generateReport(code: string): string {
    const result = this.optimizeComplete(code);

    return `
╔════════════════════════════════════════════════════════════════╗
║              📊 FreeLang v5 Week 4 최적화 보고서                 ║
╚════════════════════════════════════════════════════════════════╝

🔧 AST 최적화:
${this.astOptimizer.generateOptimizationReport(result.astResult.original, result.astResult.optimized)}

📝 타입 추론:
${this.typeInference.generateInferenceReport()}

⚡ 성능 분석:
${this.performanceTuner.generatePerformanceReport(result.perfResult)}

✨ 최종 최적화된 코드:
────────────────────────────────────────────────────────────────
${result.optimized}
════════════════════════════════════════════════════════════════
`;
  }
}
