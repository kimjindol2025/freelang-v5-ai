/**
 * FreeLang v5 Optimize Command
 * 생성된 코드 최적화
 */

import * as fs from "fs";
import * as path from "path";
import { OptimizationEngine } from "../../../Week4/optimizers/index";

/**
 * Optimize 명령 실행
 */
export async function optimizeCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("❌ 파일 경로를 입력하세요.");
    console.log('사용법: freelang optimize <파일경로>');
    process.exit(1);
  }

  const filePath = args[0];

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║              ⚡ FreeLang v5 Code Optimizer                       ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  try {
    // 파일 읽기
    console.log(`📖 Step 1: 파일 읽기\n`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
    }

    const code = fs.readFileSync(filePath, "utf-8");
    console.log(`   파일: ${filePath}`);
    console.log(`   크기: ${code.length} bytes\n`);

    // 최적화 실행
    console.log("⚡ Step 2: 자동 최적화 실행\n");
    const optimizer = new OptimizationEngine();
    const result = optimizer.optimizeComplete(code);

    console.log("   ✅ 최적화 완료\n");

    // 결과 출력
    console.log("📊 Step 3: 최적화 결과\n");
    console.log(`   원본 크기: ${code.length} bytes`);
    console.log(`   최적화 후: ${result.optimized.length} bytes`);
    console.log(`   감소: ${code.length - result.optimized.length} bytes (${(((code.length - result.optimized.length) / code.length) * 100).toFixed(1)}%)\n`);

    // AST 최적화 결과
    console.log("🔧 AST 최적화:");
    console.log(`   미사용 변수 제거: ${result.astResult?.stats?.unusedVars || 0}개`);
    console.log(`   상수 폴딩: ${result.astResult?.stats?.constantFolds || 0}개`);
    console.log(`   중복 제거: ${result.astResult?.stats?.duplicates || 0}개\n`);

    // 타입 추론 결과
    console.log("📝 타입 추론:");
    console.log(`   추론된 타입: ${result.typeResult?.stats?.inferred || 0}개`);
    console.log(`   강화된 타입: ${result.typeResult?.stats?.strengthened || 0}개\n`);

    // 최적화된 코드 저장
    const outputPath = filePath.replace(/(\.[^.]*)$/, ".optimized$1");
    fs.writeFileSync(outputPath, result.optimized);

    console.log("💾 Step 4: 저장\n");
    console.log(`   최적화된 코드: ${outputPath}\n`);

    console.log("✨ 최적화 완료!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎯 다음 단계:");
    console.log(`   1. 최적화 코드 확인: cat ${outputPath}`);
    console.log(`   2. 비교 보기: diff ${filePath} ${outputPath}`);
    console.log(`   3. 보안 검증: freelang validate ${outputPath}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("\n❌ 에러 발생:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
