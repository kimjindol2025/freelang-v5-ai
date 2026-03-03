/**
 * FreeLang v5 Week 3: 다국어 코드 생성 통합 테스트
 *
 * 테스트 항목:
 * 1. 모든 Emitter 로드 및 생성
 * 2. v4 형식 → 언어별 코드 생성
 * 3. 생성된 코드 유효성 검사
 * 4. 에러 처리
 */

import {
  TypeScriptEmitter,
  CEmitter,
  PythonEmitter,
  GoEmitter,
  RustEmitter,
  EmitterFactory,
} from "./emitters/index";
import { V4Spec } from "../Week2/src/v5-intent-parser";

/**
 * 테스트 케이스 정의
 */
const testCases = [
  {
    name: "함수 생성",
    spec: {
      type: "function",
      name: "add",
      declarations: [
        {
          type: "fn_declaration",
          name: "add",
          properties: {
            function_name: "add",
            parameter_types: ["int", "int"],
            return_type: "int",
            description: "두 수를 더합니다",
          },
        },
      ],
    } as V4Spec,
  },
  {
    name: "REST API 서버",
    spec: {
      type: "server",
      declarations: [
        {
          type: "server_declaration",
          name: "server",
          properties: {
            port: 8080,
            server_type: "rest_api",
            framework: "express",
            endpoint_count: 2,
          },
        },
        {
          type: "endpoint",
          name: "GET_/users",
          properties: {
            method: "GET",
            path: "/users",
            description: "사용자 조회",
            handler: "handleGetUsers",
          },
        },
        {
          type: "endpoint",
          name: "POST_/users",
          properties: {
            method: "POST",
            path: "/users",
            description: "사용자 생성",
            handler: "handleCreateUser",
          },
        },
      ],
    } as V4Spec,
  },
  {
    name: "데이터 필터링",
    spec: {
      type: "data",
      declarations: [
        {
          type: "data_operation",
          properties: {
            input_type: "array<int>",
            operation: "filter",
            filter: "x > 10",
            description: "10보다 큰 값만 필터링",
          },
        },
      ],
    } as V4Spec,
  },
  {
    name: "API 정의",
    spec: {
      type: "api",
      declarations: [
        {
          type: "api_definition",
          properties: {
            version: "1.0",
            base_path: "/api",
            auth_type: "jwt",
            endpoint_count: 3,
          },
        },
      ],
    } as V4Spec,
  },
  {
    name: "데이터베이스 스키마",
    spec: {
      type: "database",
      declarations: [
        {
          type: "database_schema",
          properties: {
            database_type: "postgres",
            table_count: 2,
            description: "사용자 및 주문 테이블",
          },
        },
      ],
    } as V4Spec,
  },
];

/**
 * 통합 테스트 실행
 */
async function runCodegenTest() {
  const emitterTests = [
    { lang: "ts" as const, name: "TypeScript (Express)", emitter: new TypeScriptEmitter() },
    { lang: "c" as const, name: "C (libuv)", emitter: new CEmitter() },
    { lang: "py" as const, name: "Python (FastAPI)", emitter: new PythonEmitter() },
    { lang: "go" as const, name: "Go (net/http)", emitter: new GoEmitter() },
    { lang: "rs" as const, name: "Rust (Actix)", emitter: new RustEmitter() },
  ];

  console.log("╔" + "═".repeat(78) + "╗");
  console.log(
    "║" +
      " ".repeat(20) +
      "🚀 FreeLang v5 Week 3 다국어 코드 생성 테스트" +
      " ".repeat(14) +
      "║"
  );
  console.log("╚" + "═".repeat(78) + "╝");
  console.log("");

  let passCount = 0;
  let totalCount = testCases.length * emitterTests.length;
  let failureDetails: string[] = [];

  for (const testCase of testCases) {
    console.log(`\n📝 테스트: ${testCase.name}`);
    console.log("─".repeat(80));

    for (const { lang, name, emitter } of emitterTests) {
      process.stdout.write(`  ${name.padEnd(25)} ... `);

      try {
        // Emit 코드 생성
        const code = emitter.emit(testCase.spec);

        // 코드 유효성 검사
        if (!emitter.validate(code)) {
          throw new Error("생성된 코드 유효성 검사 실패");
        }

        // 포매팅
        const formattedCode = emitter.format(code);

        console.log("✅ 성공");
        console.log(
          `     생성 코드 길이: ${code.length} bytes, 포매팅 후: ${formattedCode.length} bytes`
        );

        passCount++;
      } catch (error) {
        console.log(`❌ 실패`);
        const errorMsg = error instanceof Error ? error.message : String(error);
        failureDetails.push(`  ${testCase.name} (${name}): ${errorMsg}`);
      }
    }
  }

  // Emitter 팩토리 테스트
  console.log(`\n📝 Emitter 팩토리 테스트`);
  console.log("─".repeat(80));

  for (const lang of ["ts", "c", "py", "go", "rs"]) {
    process.stdout.write(`  ${lang.padEnd(25)} ... `);
    try {
      const emitter = EmitterFactory.create(lang as any);
      if (!emitter) {
        throw new Error("Emitter 생성 실패");
      }
      console.log("✅ 성공");
      passCount++;
      totalCount++;
    } catch (error) {
      console.log(`❌ 실패`);
      totalCount++;
    }
  }

  // 최종 결과
  console.log("\n" + "═".repeat(80));
  console.log("📊 최종 결과");
  console.log("═".repeat(80));
  console.log(`✅ 통과: ${passCount}/${totalCount}`);
  console.log(`❌ 실패: ${totalCount - passCount}/${totalCount}`);
  console.log(`🎯 성공률: ${((passCount / totalCount) * 100).toFixed(1)}%`);
  console.log("");

  if (failureDetails.length > 0) {
    console.log("❌ 실패 상세:");
    failureDetails.forEach((detail) => console.log(detail));
    console.log("");
  }

  if (passCount === totalCount) {
    console.log("🎉 모든 테스트 통과! Week 3 완료!");
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
 * 코드 샘플 출력
 */
function printCodeSample() {
  console.log("\n📄 생성된 코드 샘플\n");

  const spec: V4Spec = {
    type: "function",
    name: "multiply",
    declarations: [
      {
        type: "fn_declaration",
        name: "multiply",
        properties: {
          function_name: "multiply",
          parameter_types: ["int", "int"],
          return_type: "int",
          description: "두 수를 곱합니다",
        },
      },
    ],
  };

  const emitters = [
    { name: "TypeScript", emitter: new TypeScriptEmitter() },
    { name: "C", emitter: new CEmitter() },
    { name: "Python", emitter: new PythonEmitter() },
  ];

  for (const { name, emitter } of emitters) {
    console.log(`\n【${name} 코드】`);
    console.log("─".repeat(50));
    const code = emitter.emit(spec);
    const lines = code.split("\n").slice(0, 10);
    console.log(lines.join("\n"));
    if (code.split("\n").length > 10) {
      console.log("... (나머지 생략)");
    }
  }
}

/**
 * 메인
 */
async function main() {
  const result = await runCodegenTest();
  printCodeSample();

  process.exit(result.success ? 0 : 1);
}

// CLI 실행
if (require.main === module) {
  main().catch(console.error);
}

export { runCodegenTest };
