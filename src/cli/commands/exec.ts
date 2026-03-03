/**
 * FreeLang v5 Exec Command
 * v5 코드 직접 실행 (네이티브 인터프리터)
 */

import * as fs from "fs";
import * as path from "path";
import { FreeLangRuntime } from "../../runtime/runtime";

/**
 * Exec 명령 실행
 */
export async function execCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("❌ v5 파일 경로를 입력하세요.");
    console.log('사용법: freelang exec <파일경로>');
    console.log('예: freelang exec ./program.v5');
    process.exit(1);
  }

  const filePath = args[0];

  try {
    // 파일 확인
    if (!fs.existsSync(filePath)) {
      throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
    }

    // v5 코드 읽기
    const code = fs.readFileSync(filePath, "utf-8");

    console.log(`\n📂 파일: ${filePath}`);
    console.log(`📊 크기: ${code.length} bytes\n`);

    // Runtime 실행
    const runtime = new FreeLangRuntime();
    runtime.run(code);
  } catch (error) {
    console.error("\n❌ 에러 발생:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
