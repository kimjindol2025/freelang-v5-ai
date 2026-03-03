/**
 * FreeLang v5 Validate Command
 * 생성된 코드 보안 검증
 */

import * as fs from "fs";
import * as path from "path";
import { ValidationEngine } from "../../../Week4/validators/index";

/**
 * Validate 명령 실행
 */
export async function validateCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("❌ 파일 경로를 입력하세요.");
    console.log('사용법: freelang validate <파일경로>');
    process.exit(1);
  }

  const filePath = args[0];

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║         🔒 FreeLang v5 Security Validator                       ║");
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

    // 보안 검증 실행
    console.log("🔍 Step 2: 보안 검증\n");
    const validator = new ValidationEngine();
    const result = validator.validateSecurity(code);

    // 보안 점수
    console.log(`   보안 점수: ${result.overallScore}/100`);

    // 점수에 따른 평가
    let rating = "";
    if (result.overallScore >= 90) rating = "✅ 매우 안전";
    else if (result.overallScore >= 80) rating = "✅ 안전";
    else if (result.overallScore >= 60) rating = "⚠️  중간";
    else if (result.overallScore >= 40) rating = "🟠 위험";
    else rating = "🔴 매우 위험";

    console.log(`   평가: ${rating}\n`);

    // 발견된 이슈
    console.log("📊 Step 3: 발견된 이슈\n");
    console.log(`   총 이슈: ${result.totalIssues}개`);
    console.log(`      🔴 중대 (Critical): ${result.critical}개`);
    console.log(`      🟠 높음 (High): ${result.high}개`);
    console.log(`      🟡 중간 (Medium): ${result.medium}개`);
    console.log(`      🔵 낮음 (Low): ${result.low}개\n`);

    // 세부 이슈 출력
    if (result.issues && result.issues.length > 0) {
      console.log("⚠️  세부 이슈:\n");

      // 심각도별로 정렬
      const sortedIssues = result.issues.sort((a: any, b: any) => {
        const severityOrder: Record<string, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      sortedIssues.forEach((issue: any, idx: number) => {
        const severityEmoji: Record<string, string> = {
          critical: "🔴",
          high: "🟠",
          medium: "🟡",
          low: "🔵",
        };

        console.log(`   ${severityEmoji[issue.severity]} [${idx + 1}] ${issue.type}`);
        console.log(`       메시지: ${issue.message}`);
        if (issue.line) console.log(`       줄 번호: ${issue.line}`);
        if (issue.cweId) console.log(`       CWE: ${issue.cweId}`);
        if (issue.recommendation) console.log(`       권장: ${issue.recommendation}`);
        console.log();
      });
    } else {
      console.log("   ✅ 보안 이슈 없음!\n");
    }

    // 검증 결과 저장
    const reportPath = filePath.replace(/(\.[^.]*)$/, ".security-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

    console.log("💾 Step 4: 보고서 저장\n");
    console.log(`   보고서: ${reportPath}\n`);

    console.log("✨ 검증 완료!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (result.totalIssues > 0) {
      console.log("🎯 개선 사항:");
      console.log(`   1. 발견된 ${result.critical + result.high}개의 심각한 이슈 수정`);
      console.log("   2. 권장 사항 확인 및 적용");
      console.log("   3. 다시 검증 실행");
    } else {
      console.log("🎉 모든 보안 검사 통과!");
      console.log("   코드가 안전합니다.");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("\n❌ 에러 발생:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
