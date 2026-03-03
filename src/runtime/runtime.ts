/**
 * FreeLang v5 Runtime
 * v5 코드 → 파싱 → 실행
 */

import { V5Parser } from "./v5-parser";
import { V4Interpreter } from "./v4-interpreter";
import { V4Spec } from "../../Week2/src/v5-intent-parser";

export class FreeLangRuntime {
  private parser: V5Parser;
  private interpreter: V4Interpreter;

  constructor() {
    this.parser = new V5Parser();
    this.interpreter = new V4Interpreter();
  }

  /**
   * v5 코드 실행
   */
  run(code: string): any {
    try {
      console.log("\n╔════════════════════════════════════════════════════════════════╗");
      console.log("║          🚀 FreeLang v5 Native Interpreter                     ║");
      console.log("╚════════════════════════════════════════════════════════════════╝\n");

      // 1️⃣ 파싱
      console.log("📝 Step 1: v5 코드 파싱\n");
      const spec = this.parser.parse(code);

      console.log(`   선언문: ${spec.declarations?.length || 0}개`);
      spec.declarations?.forEach((decl) => {
        console.log(`     - ${decl.type}: ${decl.name}`);
      });
      console.log();

      // 2️⃣ 실행
      console.log("⚡ Step 2: v4 해석 및 실행\n");
      const result = this.interpreter.execute(spec);

      console.log("\n✨ 실행 완료!\n");
      return result;
    } catch (error) {
      console.error("\n❌ 에러:", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * 파일에서 읽은 v5 코드 실행
   */
  runFile(filePath: string): any {
    const fs = require("fs");
    const code = fs.readFileSync(filePath, "utf-8");
    return this.run(code);
  }

  /**
   * 함수 호출
   */
  call(functionName: string, ...args: any[]): any {
    return this.interpreter.call(functionName, ...args);
  }

  /**
   * 변수 조회
   */
  getVariable(name: string): any {
    return this.interpreter.getVariable(name);
  }

  /**
   * 변수 설정
   */
  setVariable(name: string, value: any): void {
    this.interpreter.setVariable(name, value);
  }
}

/**
 * 테스트
 */
export function testFreeLangRuntime() {
  const runtime = new FreeLangRuntime();

  const code = `
fn add(a: number, b: number) → number {
  return a + b;
}

fn multiply(a: number, b: number) → number {
  return a * b;
}
`;

  console.log("🧪 FreeLang Runtime Test\n");
  console.log("📝 실행할 v5 코드:");
  console.log(code);

  runtime.run(code);

  console.log("🔧 함수 호출:");
  console.log(`  add(10, 20) = ${runtime.call("add", 10, 20)}`);
  console.log(`  multiply(5, 6) = ${runtime.call("multiply", 5, 6)}\n`);
}
