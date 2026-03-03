/**
 * Security Validator
 * 생성된 코드의 보안 취약점을 검사
 *
 * 검증 항목:
 * 1. SQL Injection 취약점
 * 2. XSS 취약점
 * 3. 하드코딩된 자격증명
 * 4. 위험한 함수 사용
 * 5. 불충분한 입력 검증
 */

/**
 * 보안 이슈
 */
export interface SecurityIssue {
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  message: string;
  line?: number;
  recommendation?: string;
}

/**
 * 보안 검증 결과
 */
export interface SecurityValidationResult {
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  issues: SecurityIssue[];
  overallScore: number; // 0-100
}

/**
 * 보안 검증 엔진
 */
export class SecurityValidator {
  private patterns = {
    // SQL Injection 패턴
    sqlInjection: [
      /query\s*\(\s*["'].*\$\{.*\}.*["']/gi, // template literals in queries
      /sql\s*=\s*["'].*\+.*["']/gi, // string concatenation in SQL
      /execute\s*\(\s*["'].*\+/gi, // concatenation before execute
    ],

    // XSS 취약점
    xss: [
      /innerHTML\s*=/gi,
      /dangerouslySetInnerHTML/gi,
      /\.html\(/gi,
      /eval\s*\(/gi,
    ],

    // 하드코딩된 자격증명
    hardcodedCredentials: [
      /password\s*=\s*["'][^"']*["']/gi,
      /api[_-]?key\s*=\s*["'][^"']*["']/gi,
      /secret\s*=\s*["'][^"']*["']/gi,
      /token\s*=\s*["'][^"']*["']/gi,
    ],

    // 위험한 함수
    dangerousFunctions: [
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi,
      /shell_exec\s*\(/gi,
      /popen\s*\(/gi,
    ],

    // 불충분한 입력 검증
    noValidation: [
      /req\.body\b/gi,
      /req\.params\b/gi,
      /req\.query\b/gi,
      /process\.argv/gi,
      /sys\.argv/gi,
    ],
  };

  /**
   * 코드 보안 검증
   */
  validate(code: string): SecurityValidationResult {
    const issues: SecurityIssue[] = [];
    const lines = code.split("\n");

    // 각 보안 패턴 검사
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // SQL Injection 검사
      issues.push(...this.checkSQLInjection(line, i + 1));

      // XSS 검사
      issues.push(...this.checkXSS(line, i + 1));

      // 하드코딩된 자격증명 검사
      issues.push(...this.checkHardcodedCredentials(line, i + 1));

      // 위험한 함수 검사
      issues.push(...this.checkDangerousFunctions(line, i + 1));

      // 입력 검증 검사
      issues.push(...this.checkInputValidation(line, i + 1));
    }

    // 통계 계산
    const critical = issues.filter((i) => i.severity === "critical").length;
    const high = issues.filter((i) => i.severity === "high").length;
    const medium = issues.filter((i) => i.severity === "medium").length;
    const low = issues.filter((i) => i.severity === "low").length;

    // 보안 점수 계산 (0-100)
    const overallScore = Math.max(
      0,
      100 - critical * 20 - high * 10 - medium * 5 - low * 2
    );

    return {
      totalIssues: issues.length,
      critical,
      high,
      medium,
      low,
      issues,
      overallScore,
    };
  }

  /**
   * SQL Injection 검사
   */
  private checkSQLInjection(line: string, lineNumber: number): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    if (/query\s*\(\s*["'].*\$\{.*\}.*["']/.test(line)) {
      issues.push({
        severity: "critical",
        category: "SQL Injection",
        message: "사용자 입력을 직접 SQL에 포함하면 SQL Injection 취약점 발생",
        line: lineNumber,
        recommendation:
          "Prepared Statements 또는 파라미터화된 쿼리 사용 (e.g., query('SELECT * FROM users WHERE id = ?', [userId])",
      });
    }

    if (/sql\s*=\s*["'].*\+.*["']/.test(line)) {
      issues.push({
        severity: "critical",
        category: "SQL Injection",
        message: "문자열 연결을 사용한 동적 SQL 쿼리",
        line: lineNumber,
        recommendation: "ORM (Sequelize, TypeORM 등) 또는 Prepared Statements 사용",
      });
    }

    return issues;
  }

  /**
   * XSS 검사
   */
  private checkXSS(line: string, lineNumber: number): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    if (/innerHTML\s*=/.test(line)) {
      issues.push({
        severity: "high",
        category: "XSS (Cross-Site Scripting)",
        message: "innerHTML은 XSS 취약점의 원인이 될 수 있음",
        line: lineNumber,
        recommendation: "textContent 또는 템플릿 엔진 사용 (e.g., React, Vue)",
      });
    }

    if (/eval\s*\(/.test(line)) {
      issues.push({
        severity: "critical",
        category: "Code Injection",
        message: "eval() 함수는 매우 위험한 보안 취약점",
        line: lineNumber,
        recommendation: "eval() 사용 금지, JSON.parse() 또는 다른 안전한 방법 사용",
      });
    }

    return issues;
  }

  /**
   * 하드코딩된 자격증명 검사
   */
  private checkHardcodedCredentials(line: string, lineNumber: number): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    if (/password\s*=\s*["']([^"']+)["']/.test(line)) {
      issues.push({
        severity: "critical",
        category: "Hardcoded Credentials",
        message: "비밀번호가 소스 코드에 하드코딩되어 있음",
        line: lineNumber,
        recommendation: "환경변수 (process.env.PASSWORD) 또는 .env 파일 사용",
      });
    }

    if (/api[_-]?key\s*=\s*["']([^"']+)["']/.test(line)) {
      issues.push({
        severity: "critical",
        category: "Hardcoded Credentials",
        message: "API 키가 소스 코드에 하드코딩되어 있음",
        line: lineNumber,
        recommendation: "환경변수 (process.env.API_KEY) 사용",
      });
    }

    if (/secret\s*=\s*["']([^"']+)["']/.test(line)) {
      issues.push({
        severity: "critical",
        category: "Hardcoded Credentials",
        message: "Secret이 소스 코드에 하드코딩되어 있음",
        line: lineNumber,
        recommendation: "보안 관리 시스템 (AWS Secrets Manager, HashiCorp Vault) 사용",
      });
    }

    return issues;
  }

  /**
   * 위험한 함수 검사
   */
  private checkDangerousFunctions(line: string, lineNumber: number): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    if (/\beval\s*\(/.test(line)) {
      issues.push({
        severity: "critical",
        category: "Dangerous Function",
        message: "eval() 함수 사용",
        line: lineNumber,
        recommendation: "eval() 제거, JSON.parse() 또는 Function 생성자 대신 사용",
      });
    }

    if (/\bexec\s*\(|shell_exec\s*\(|system\s*\(/.test(line)) {
      issues.push({
        severity: "critical",
        category: "Command Injection",
        message: "외부 명령 실행 함수 사용 (Command Injection 위험)",
        line: lineNumber,
        recommendation: "child_process.execFile() 또는 안전한 라이브러리 사용",
      });
    }

    return issues;
  }

  /**
   * 입력 검증 검사
   */
  private checkInputValidation(line: string, lineNumber: number): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    if (/req\.(body|params|query)/.test(line)) {
      // 바로 다음 줄에서 검증 여부 확인
      if (!line.includes("validate") && !line.includes("sanitize") && !line.includes("check")) {
        issues.push({
          severity: "medium",
          category: "Input Validation",
          message: "사용자 입력에 대한 검증이 없음",
          line: lineNumber,
          recommendation:
            "express-validator, joi, yup 등을 사용하여 입력 검증 추가 (e.g., body('email').isEmail())",
        });
      }
    }

    return issues;
  }

  /**
   * 보안 리포트 생성
   */
  generateSecurityReport(result: SecurityValidationResult): string {
    const scoreColor =
      result.overallScore >= 80
        ? "🟢"
        : result.overallScore >= 60
          ? "🟡"
          : result.overallScore >= 40
            ? "🟠"
            : "🔴";

    return `
╔════════════════════════════════════════════════════════════════╗
║                  🔒 보안 검증 리포트                            ║
╚════════════════════════════════════════════════════════════════╝

📊 보안 점수: ${scoreColor} ${result.overallScore}/100

📈 이슈 요약:
  🔴 중대 (Critical): ${result.critical}개
  🟠 높음 (High):     ${result.high}개
  🟡 중간 (Medium):   ${result.medium}개
  🔵 낮음 (Low):      ${result.low}개
  ─────────────────
  합계:              ${result.totalIssues}개

${result.issues.length > 0 ? `세부 이슈:` : "✅ 보안 이슈 없음!"}
${result.issues
  .map(
    (issue) =>
      `
  [${issue.severity.toUpperCase()}] ${issue.category}
    메시지: ${issue.message}
    ${issue.line ? `줄 번호: ${issue.line}` : ""}
    ${issue.recommendation ? `권장사항: ${issue.recommendation}` : ""}
  `
  )
  .join("")}

════════════════════════════════════════════════════════════════
`;
  }
}

/**
 * 테스트
 */
export function testSecurityValidator() {
  const validator = new SecurityValidator();

  const insecureCode = `
function login(username, password) {
  // SQL Injection 취약점
  const query = "SELECT * FROM users WHERE username = '" + username + "'";

  // 하드코딩된 자격증명
  const apiKey = "sk-1234567890abcdef";
  const secret = "my-secret-key";

  // XSS 취약점
  document.getElementById("output").innerHTML = userInput;

  // 입력 검증 없음
  const userId = req.body.userId;

  return database.execute(query);
}
`;

  console.log("테스트 코드:");
  console.log(insecureCode);
  console.log("\n보안 검증 중...\n");

  const result = validator.validate(insecureCode);

  console.log(validator.generateSecurityReport(result));
}

// CLI 실행
if (require.main === module) {
  testSecurityValidator();
}
