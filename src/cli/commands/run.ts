/**
 * FreeLang v5 Run Command
 * 생성된 코드 직접 실행
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { V5IntentParser } from "../../../Week2/src/v5-intent-parser";
import { V4FormatConverter } from "../../../Week2/src/v4-format-converter";
import { EmitterFactory } from "../../../Week3/emitters/index";

/**
 * Run 명령 실행
 */
export async function runCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("❌ Intent를 입력하세요.");
    console.log('사용법: freelang run "당신의 의도"');
    process.exit(1);
  }

  const intent = args.join(" ").replace(/^["']|["']$/g, "");

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║        🚀 FreeLang v5 Runtime - 코드 직접 실행                  ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  try {
    // 1️⃣ Intent 파싱
    console.log("📝 Step 1: Intent 파싱\n");
    console.log(`   입력: "${intent}"\n`);

    let parsedIntent: any;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("   ⚠️  Demo 모드: 샘플 코드 실행\n");

      // 의도에 따라 다른 Demo 코드 생성
      if (
        intent.includes("덧셈") ||
        intent.includes("add") ||
        intent.includes("더") ||
        intent.includes("+") ||
        intent.includes("합")
      ) {
        parsedIntent = {
          action: "create",
          context: "function",
          parameters: {
            name: "add",
            inputs: [
              { name: "a", type: "number" },
              { name: "b", type: "number" }
            ],
            output: "number",
            description: "두 숫자를 더하는 함수",
            logic: "return a + b;",
          },
        };
      } else if (intent.includes("인사") || intent.includes("hello") || intent.includes("greet")) {
        parsedIntent = {
          action: "create",
          context: "function",
          parameters: {
            name: "greet",
            inputs: [{ name: "name", type: "string" }],
            output: "string",
            description: "인사 함수",
            logic: "return `Hello, ${name}!`;",
          },
        };
      } else {
        parsedIntent = {
          action: "create",
          context: "function",
          parameters: {
            name: "demo",
            inputs: [],
            output: "string",
            description: "Demo 함수",
            logic: "return 'FreeLang v5 런타임 작동 중!';",
          },
        };
      }
    } else {
      const parser = new V5IntentParser(process.env.ANTHROPIC_API_KEY);
      parsedIntent = await parser.parseIntent(intent);
    }

    console.log("   ✅ 파싱 완료\n");

    // 2️⃣ v4 변환
    console.log("📋 Step 2: v4 Specification 변환\n");
    const converter = new V4FormatConverter();
    const v4Spec = converter.convert(parsedIntent);
    console.log("   ✅ 변환 완료\n");

    // 3️⃣ TypeScript 생성
    console.log("💻 Step 3: TypeScript 코드 생성\n");
    const emitter = EmitterFactory.create("ts");
    let tsCode = emitter.emit(v4Spec);

    // 함수 호출 코드 추가
    const functionName = parsedIntent.parameters.name || "demo";
    const inputs = parsedIntent.parameters.inputs || [];

    if (inputs.length === 0) {
      tsCode += `\n\n// Runtime: 함수 실행\nconsole.log(${functionName}());`;
    } else if (functionName === "add") {
      tsCode += `\n\n// Runtime: 함수 실행\nconsole.log(\`결과: \${${functionName}(10, 20)}\`);`;
    } else if (functionName === "greet") {
      tsCode += `\n\n// Runtime: 함수 실행\nconsole.log(${functionName}("FreeLang"));`;
    } else {
      // 일반적인 경우: 샘플 호출
      const sampleArgs = inputs.map((_: any, i: number) => `arg${i}`).join(", ");
      tsCode += `\n\n// Runtime: 함수 실행\nconsole.log(${functionName}(${sampleArgs}));`;
    }

    // 임시 파일에 저장
    const tmpDir = path.join(process.cwd(), ".freelang-tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const tmpFile = path.join(tmpDir, `run_${Date.now()}.ts`);
    fs.writeFileSync(tmpFile, tsCode);
    console.log(`   생성 파일: ${tmpFile}\n`);

    // 4️⃣ TypeScript 실행
    console.log("⚡ Step 4: 코드 실행\n");
    console.log("📝 생성된 코드:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(tsCode);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("🚀 실행 결과:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
      // ts-node로 실행
      const result = execSync(`npx ts-node "${tmpFile}"`, {
        encoding: "utf-8",
      });

      console.log(result);
    } catch (e: any) {
      // stderr도 출력
      if (e.stdout) console.log(e.stdout.toString());
      if (e.stderr) console.log(e.stderr.toString());
      else console.log("(no output)");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // 정리
    try {
      fs.unlinkSync(tmpFile);
    } catch (e) {
      // 파일 삭제 실패 무시
    }

    console.log("✨ 실행 완료!\n");
    console.log("🎯 다음 단계:");
    console.log(`   1. 코드 생성: freelang generate "${intent}"`);
    console.log(`   2. 코드 최적화: freelang optimize <파일>`);
    console.log(`   3. 보안 검증: freelang validate <파일>\n`);
  } catch (error) {
    console.error("\n❌ 에러 발생:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
