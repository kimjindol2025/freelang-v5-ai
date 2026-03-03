/**
 * Week 4 Validators Index
 * 모든 검증 모듈 내보내기
 */

export { SecurityValidator, SecurityValidationResult, SecurityIssue } from "./security-validator";

import { SecurityValidator } from "./security-validator";

/**
 * 통합 검증 엔진
 */
export class ValidationEngine {
  private securityValidator: SecurityValidator;

  constructor() {
    this.securityValidator = new SecurityValidator();
  }

  /**
   * 전체 검증 파이프라인
   */
  validateComplete(code: string) {
    return {
      security: this.securityValidator.validate(code),
    };
  }

  /**
   * 보안 검증만
   */
  validateSecurity(code: string) {
    return this.securityValidator.validate(code);
  }

  /**
   * 통합 검증 리포트
   */
  generateReport(code: string): string {
    const securityResult = this.securityValidator.validate(code);

    return `
╔════════════════════════════════════════════════════════════════╗
║              🛡️  FreeLang v5 Week 4 검증 보고서                 ║
╚════════════════════════════════════════════════════════════════╝

🔒 보안 검증:
${this.securityValidator.generateSecurityReport(securityResult)}

════════════════════════════════════════════════════════════════
`;
  }
}
