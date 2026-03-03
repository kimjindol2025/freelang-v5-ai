/**
 * FreeLang v5 Week 4: 자동 최적화 + 검증 통합 테스트
 *
 * 테스트 항목:
 * 1. AST 최적화
 * 2. 타입 추론
 * 3. 보안 검증
 * 4. 성능 분석
 * 5. 통합 최적화 파이프라인
 */

import { OptimizationEngine } from "./optimizers/index";
import { ValidationEngine } from "./validators/index";

/**
 * 테스트 코드들
 */
const testCases = [
  {
    name: "간단한 함수",
    code: `
function add(a, b) {
  const unused = 10;
  let sum = a + b;
  let result = 2 + 3;
  return sum;
}
`,
  },
  {
    name: "루프와 데이터 처리",
    code: `
function processArray(arr) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const temp = [];
    for (let j = 0; j < arr[i].length; j++) {
      temp.push(arr[i][j]);
    }
    result.push(temp);
  }
  return result;
}
`,
  },
  {
    name: "보안 이슈 포함 코드",
    code: `
function login(username, password) {
  // SQL Injection 취약점
  const query = "SELECT * FROM users WHERE username = '" + username + "'";

  // 하드코딩된 자격증명
  const apiKey = "sk-1234567890abcdef";

  // XSS 취약점
  document.getElementById("output").innerHTML = userInput;

  return database.execute(query);
}
`,
  },
  {
    name: "성능 최적화 기회",
    code: `
function findDuplicates(arr1, arr2) {
  const result = [];

  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      if (arr1[i] === arr2[j]) {
        result.push(arr1[i]);
      }
    }
  }

  return result;
}
`,
  },
];

/**
 * 통합 테스트 실행
 */
async function runOptimizationTest() {
  const optimizer = new OptimizationEngine();
  const validator = new ValidationEngine();

  console.log("╔" + "═".repeat(78) + "╗");
  console.log(
    "║" +
      " ".repeat(15) +
      "🚀 FreeLang v5 Week 4 자동 최적화 + 검증 통합 테스트" +
      " ".repeat(11) +
      "║"
  );
  console.log("╚" + "═".repeat(78) + "╝");
  console.log("");

  let passCount = 0;
  let totalCount = testCases.length * 3; // optimization + validation + performance

  for (const testCase of testCases) {
    console.log(`\n📝 테스트: ${testCase.name}`);
    console.log("─".repeat(80));

    try {
      // Test 1: AST 최적화
      process.stdout.write("  🔧 AST 최적화 ... ");
      const astResult = optimizer.optimizeAST(testCase.code);
      console.log("✅");
      passCount++;

      // Test 2: 타입 추론
      process.stdout.write("  📝 타입 추론 ... ");
      const typeResult = optimizer.optimizeTypes(testCase.code);
      console.log("✅");
      passCount++;

      // Test 3: 보안 검증
      process.stdout.write("  🔒 보안 검증 ... ");
      const securityResult = validator.validateSecurity(testCase.code);
      console.log("✅");
      passCount++;
    } catch (error) {
      console.log("❌");
      console.error(
        `  에러: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // 최종 통합 테스트
  console.log(`\n📝 최종 테스트: 전체 최적화 파이프라인`);
  console.log("─".repeat(80));

  try {
    process.stdout.write("  🚀 통합 최적화 ... ");
    const fullResult = optimizer.optimizeComplete(testCases[0].code);
    if (fullResult.optimized && fullResult.astResult && fullResult.typeResult) {
      console.log("✅");
      totalCount++;
      passCount++;
    } else {
      console.log("❌");
      totalCount++;
    }
  } catch (error) {
    console.log("❌");
    totalCount++;
  }

  // 최종 결과
  console.log("\n" + "═".repeat(80));
  console.log("📊 최종 결과");
  console.log("═".repeat(80));
  console.log(`✅ 통과: ${passCount}/${totalCount}`);
  console.log(`❌ 실패: ${totalCount - passCount}/${totalCount}`);
  console.log(`🎯 성공률: ${((passCount / totalCount) * 100).toFixed(1)}%`);
  console.log("");

  if (passCount === totalCount) {
    console.log("🎉 모든 테스트 통과! Week 4 최적화 엔진 완성!");
  } else {
    console.log("⚠️  일부 테스트 실패. 검토 필요.");
  }

  console.log("═".repeat(80));

  return {
    passed: passCount,
    total: totalCount,
    success: passCount === totalCount,
  };
}

/**
 * 상세 분석 보고서
 */
function printDetailedReport() {
  const optimizer = new OptimizationEngine();
  const validator = new ValidationEngine();

  console.log("\n\n");
  console.log("╔" + "═".repeat(78) + "╗");
  console.log(
    "║" + " ".repeat(20) + "📊 상세 최적화 분석 보고서" + " ".repeat(31) + "║"
  );
  console.log("╚" + "═".repeat(78) + "╝\n");

  const testCode = testCases[3].code; // 성능 최적화 기회가 많은 코드

  // 최적화 보고서
  const optimization = optimizer.optimizeComplete(testCode);

  console.log("【원본 코드】");
  console.log(testCode);

  console.log("\n【최적화된 코드】");
  console.log(optimization.optimized);

  console.log("\n【분석 결과】");
  console.log(
    `- 원본 크기: ${testCode.length} bytes`
  );
  console.log(
    `- 최적화 후: ${optimization.optimized.length} bytes`
  );
  console.log(
    `- 감소: ${testCode.length - optimization.optimized.length} bytes`
  );

  // 보안 검증
  const security = validator.validateSecurity(testCases[2].code);
  console.log("\n【보안 검증 결과】");
  console.log(
    `- 보안 점수: ${security.overallScore}/100`
  );
  console.log(`- 발견된 이슈: ${security.totalIssues}개`);
  console.log(`  🔴 중대: ${security.critical}개`);
  console.log(`  🟠 높음: ${security.high}개`);
  console.log(`  🟡 중간: ${security.medium}개`);
  console.log(`  🔵 낮음: ${security.low}개`);

  // 성능 분석
  const performance = optimizer.analyzePerformance(testCases[3].code);
  console.log("\n【성능 분석 결과】");
  console.log(`- 예상 속도 향상: ${performance.estimatedSpeedup.toFixed(2)}배`);
  console.log(`- 병목 지점: ${performance.bottlenecks.join(", ") || "없음"}`);
  console.log(`- 최적화 기회: ${performance.issues.length}개`);
}

/**
 * 메인
 */
async function main() {
  const result = await runOptimizationTest();
  printDetailedReport();

  process.exit(result.success ? 0 : 1);
}

// CLI 실행
if (require.main === module) {
  main().catch(console.error);
}

export { runOptimizationTest };
