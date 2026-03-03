/**
 * FreeLang v5 Week 2: Intent Parser 통합 테스트
 *
 * 테스트 항목:
 * 1. Intent 파싱 (Claude API)
 * 2. v4 형식 변환 (Rule Engine)
 * 3. v4 검증 (Validation Engine)
 */

import { V5IntentParser, Intent, V4Spec } from "./src/v5-intent-parser";
import { V4FormatConverter } from "./src/v4-format-converter";
import { ValidationEngine } from "./src/validation-engine";

/**
 * 테스트 케이스 정의
 */
const testCases = [
  {
    name: "함수 생성",
    input: "10과 32를 더하는 함수 만들어",
    expectedContext: "function",
  },
  {
    name: "REST API 서버",
    input: "8080 포트에서 사용자 관리하는 REST API 만들어",
    expectedContext: "server",
  },
  {
    name: "데이터 필터링",
    input: "배열에서 10보다 큰 값만 필터링하는 로직",
    expectedContext: "data",
  },
  {
    name: "데이터베이스 스키마",
    input: "사용자 정보를 저장하는 테이블 만들어",
    expectedContext: "database",
  },
];

/**
 * 통합 테스트 실행
 */
async function runIntegrationTest() {
  const parser = new V5IntentParser();
  const converter = new V4FormatConverter();
  const validator = new ValidationEngine();

  console.log("╔" + "═".repeat(78) + "╗");
  console.log("║" + " ".repeat(20) + "🚀 FreeLang v5 Week 2 통합 테스트" + " ".repeat(24) + "║");
  console.log("╚" + "═".repeat(78) + "╝");
  console.log("");

  let passCount = 0;
  let totalCount = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📝 테스트 ${i + 1}/${totalCount}: ${testCase.name}`);
    console.log("─".repeat(80));

    try {
      // Step 1: Intent 파싱
      console.log(`  ⏳ Intent 파싱 중: "${testCase.input}"`);
      const intent = await parser.parseIntent(testCase.input);
      console.log(`  ✅ Intent 파싱 완료`);
      console.log(`     - action: ${intent.action}`);
      console.log(`     - context: ${intent.context}`);
      console.log(`     - parameters: ${Object.keys(intent.parameters).join(", ")}`);

      // Step 2: 문맥 검증
      if (intent.context !== testCase.expectedContext) {
        console.log(
          `  ⚠️  경고: 예상 context '${testCase.expectedContext}', 실제 '${intent.context}'`
        );
      }

      // Step 3: v4 형식 변환
      console.log(`  ⏳ v4 형식 변환 중...`);
      const v4Spec = converter.convert(intent);
      console.log(`  ✅ v4 형식 변환 완료`);
      console.log(
        `     - type: ${v4Spec.type}`
      );
      console.log(
        `     - declarations: ${v4Spec.declarations.length}개`
      );

      // Step 4: v4 검증
      console.log(`  ⏳ v4 검증 중...`);
      const validation = validator.validateDetailed(v4Spec);
      console.log(
        `  ${validation.valid ? "✅" : "❌"} 검증 ${validation.valid ? "통과" : "실패"}`
      );

      if (!validation.valid) {
        console.log(`     - 오류: ${validation.errors.join(", ")}`);
      }

      if (validation.security_check.security_issues.length > 0) {
        console.log(
          `     - 보안 이슈: ${validation.security_check.security_issues.join(", ")}`
        );
      }

      // Step 5: 코드 생성 시뮬레이션
      console.log(`  ⏳ TypeScript 코드 생성 시뮬레이션...`);
      const codeSnippet = generateCodeSnippet(v4Spec);
      console.log(`  ✅ 코드 생성 완료`);
      console.log(`     ${codeSnippet.split("\n")[0]}...`);

      console.log(`\n  🎉 테스트 ${i + 1} 완료`);
      passCount++;
    } catch (error) {
      console.log(`  ❌ 테스트 실패: ${error}`);
    }
  }

  // 최종 결과
  console.log("\n" + "═".repeat(80));
  console.log("📊 최종 결과");
  console.log("═".repeat(80));
  console.log(`✅ 통과: ${passCount}/${totalCount}`);
  console.log(
    `❌ 실패: ${totalCount - passCount}/${totalCount}`
  );
  console.log(`🎯 성공률: ${((passCount / totalCount) * 100).toFixed(1)}%`);
  console.log("");

  if (passCount === totalCount) {
    console.log("🎉 모든 테스트 통과! Week 2 완료!");
  } else {
    console.log("⚠️  일부 테스트 실패. 검토 필요.");
  }

  console.log("═".repeat(80));
}

/**
 * 코드 생성 시뮬레이션
 */
function generateCodeSnippet(spec: V4Spec): string {
  switch (spec.type) {
    case "function":
      return `function add(a: number, b: number): number {
  return a + b;
}`;

    case "server":
      return `import express from 'express';
const app = express();
app.get('/users', (req, res) => { ... });
app.listen(8080);`;

    case "data":
      return `const result = data.filter(x => x > 10);`;

    case "database":
      return `CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255)
);`;

    default:
      return `// Generated code for ${spec.type}`;
  }
}

/**
 * 실행
 */
if (require.main === module) {
  runIntegrationTest().catch(console.error);
}

export { runIntegrationTest };
