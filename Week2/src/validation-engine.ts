/**
 * FreeLang v4 Validation Engine
 * v4 형식 검증 + 보안/타입 검사
 */

import { V4Spec, ValidationResult } from "./v5-intent-parser";

/**
 * 상세 검증 결과
 */
export interface DetailedValidationResult extends ValidationResult {
  type_check: TypeCheckResult;
  security_check: SecurityCheckResult;
  semantic_check: SemanticCheckResult;
}

export interface TypeCheckResult {
  valid: boolean;
  type_errors: string[];
  type_warnings: string[];
}

export interface SecurityCheckResult {
  valid: boolean;
  security_issues: string[];
  recommendations: string[];
}

export interface SemanticCheckResult {
  valid: boolean;
  semantic_errors: string[];
  style_warnings: string[];
}

/**
 * 검증 엔진
 */
export class ValidationEngine {
  /**
   * 기본 v4 검증
   */
  validateBasic(spec: V4Spec): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 필수 필드
    if (!spec.type) {
      errors.push("spec.type이 필수입니다");
    }

    if (!spec.declarations || spec.declarations.length === 0) {
      warnings.push("declarations가 비어있습니다");
    }

    // 타입 검증
    const validTypes = [
      "function",
      "server",
      "data",
      "api",
      "database",
      "security",
    ];
    if (spec.type && !validTypes.includes(spec.type)) {
      errors.push(`유효하지 않은 타입: ${spec.type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 상세 검증 (기본 + 타입 + 보안 + 의미론)
   */
  validateDetailed(spec: V4Spec): DetailedValidationResult {
    const basic = this.validateBasic(spec);

    return {
      ...basic,
      type_check: this.checkTypes(spec),
      security_check: this.checkSecurity(spec),
      semantic_check: this.checkSemantics(spec),
    };
  }

  /**
   * 타입 검증
   */
  private checkTypes(spec: V4Spec): TypeCheckResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (spec.type === "function") {
      const decl = spec.declarations[0];
      if (decl.properties) {
        const { parameter_types, return_type } = decl.properties;

        // 파라미터 타입 검증
        if (parameter_types) {
          const validTypes = [
            "int",
            "float",
            "string",
            "bool",
            "array",
            "object",
            "void",
          ];
          parameter_types.forEach((type: string, index: number) => {
            if (!validTypes.some((vt) => type.includes(vt))) {
              errors.push(`파라미터 ${index}: 유효하지 않은 타입 '${type}'`);
            }
          });
        }

        // 반환 타입 검증
        if (return_type) {
          const validReturnTypes = [
            "int",
            "float",
            "string",
            "bool",
            "array",
            "object",
            "void",
          ];
          if (!validReturnTypes.some((vt) => return_type.includes(vt))) {
            errors.push(`반환 타입: 유효하지 않은 타입 '${return_type}'`);
          }
        }
      }
    }

    if (spec.type === "server") {
      const decl = spec.declarations[0];
      if (decl.properties) {
        const { port } = decl.properties;

        // 포트 검증
        if (port && (port < 1 || port > 65535)) {
          errors.push(`포트 범위 오류: ${port} (1-65535)`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      type_errors: errors,
      type_warnings: warnings,
    };
  }

  /**
   * 보안 검증
   */
  private checkSecurity(spec: V4Spec): SecurityCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (spec.type === "api") {
      const decl = spec.declarations[0];
      if (decl.properties) {
        const { auth_type } = decl.properties;

        if (!auth_type || auth_type === "none") {
          issues.push("❌ API 인증이 없습니다");
          recommendations.push("✅ JWT 또는 OAuth2 인증 추가");
        }
      }
    }

    if (spec.type === "server") {
      const decl = spec.declarations[0];
      if (decl.properties) {
        recommendations.push("✅ CORS 설정 추가");
        recommendations.push("✅ Rate limiting 적용");
        recommendations.push("✅ Input validation 구현");
      }
    }

    if (spec.type === "database") {
      const decl = spec.declarations[0];
      if (decl.properties) {
        const { database_type } = decl.properties;

        recommendations.push("✅ SQL Injection 방지 (Prepared Statements)");
        recommendations.push("✅ 데이터 암호화");
        recommendations.push("✅ 백업 정책 수립");
      }
    }

    return {
      valid: issues.length === 0,
      security_issues: issues,
      recommendations,
    };
  }

  /**
   * 의미론 검증
   */
  private checkSemantics(spec: V4Spec): SemanticCheckResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 선언 이름 검증
    if (spec.declarations) {
      spec.declarations.forEach((decl, index) => {
        if (!decl.type) {
          errors.push(`declarations[${index}].type이 필수입니다`);
        }

        // 함수명 검증 (camelCase)
        if (spec.type === "function" && decl.name) {
          if (!/^[a-z][a-zA-Z0-9]*$/.test(decl.name)) {
            warnings.push(
              `함수명 '${decl.name}'이 camelCase를 따르지 않습니다`
            );
          }
        }
      });
    }

    // 메타데이터 권장
    if (!spec.metadata || !spec.metadata.description) {
      warnings.push("설명(description)을 추가하는 것을 권장합니다");
    }

    return {
      valid: errors.length === 0,
      semantic_errors: errors,
      style_warnings: warnings,
    };
  }

  /**
   * 검증 결과 서식 (콘솔 출력용)
   */
  formatValidationResult(result: DetailedValidationResult): string {
    const lines: string[] = [];

    lines.push("═".repeat(60));
    lines.push("📋 검증 결과");
    lines.push("═".repeat(60));

    // 기본 검증
    lines.push(
      `✅ 기본: ${result.valid ? "통과" : "실패"} (${result.errors.length} 오류, ${result.warnings.length} 경고)`
    );

    if (result.errors.length > 0) {
      lines.push("  ❌ 오류:");
      result.errors.forEach((err) => lines.push(`    - ${err}`));
    }

    if (result.warnings.length > 0) {
      lines.push("  ⚠️  경고:");
      result.warnings.forEach((warn) => lines.push(`    - ${warn}`));
    }

    lines.push("");

    // 타입 검증
    lines.push(
      `✅ 타입: ${result.type_check.valid ? "통과" : "실패"} (${result.type_check.type_errors.length} 오류)`
    );
    if (result.type_check.type_errors.length > 0) {
      lines.push("  ❌ 타입 오류:");
      result.type_check.type_errors.forEach((err) =>
        lines.push(`    - ${err}`)
      );
    }

    lines.push("");

    // 보안 검증
    lines.push(
      `🔒 보안: ${result.security_check.valid ? "안전" : "문제 있음"} (${result.security_check.security_issues.length} 이슈)`
    );
    if (result.security_check.security_issues.length > 0) {
      result.security_check.security_issues.forEach((issue) =>
        lines.push(`  ${issue}`)
      );
    }
    if (result.security_check.recommendations.length > 0) {
      lines.push("  📌 권장사항:");
      result.security_check.recommendations.forEach((rec) =>
        lines.push(`    ${rec}`)
      );
    }

    lines.push("");

    // 의미론 검증
    lines.push(
      `🔍 의미론: ${result.semantic_check.valid ? "통과" : "오류 있음"}`
    );
    if (result.semantic_check.semantic_errors.length > 0) {
      lines.push("  ❌ 오류:");
      result.semantic_check.semantic_errors.forEach((err) =>
        lines.push(`    - ${err}`)
      );
    }
    if (result.semantic_check.style_warnings.length > 0) {
      lines.push("  ⚠️  스타일:");
      result.semantic_check.style_warnings.forEach((warn) =>
        lines.push(`    - ${warn}`)
      );
    }

    lines.push("");
    lines.push("═".repeat(60));

    return lines.join("\n");
  }
}

/**
 * 테스트
 */
export function testValidation() {
  const engine = new ValidationEngine();

  // Test 1: 유효한 Function spec
  const validFunctionSpec: V4Spec = {
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
    metadata: { description: "더하기 함수" },
  };

  console.log("Test 1: 유효한 Function");
  const result1 = engine.validateDetailed(validFunctionSpec);
  console.log(engine.formatValidationResult(result1));

  // Test 2: 보안 이슈가 있는 API spec
  const apiSpec: V4Spec = {
    type: "api",
    declarations: [
      {
        type: "api_definition",
        properties: {
          version: "1.0",
          base_path: "/api",
          auth_type: "none", // 보안 이슈!
          endpoint_count: 3,
        },
      },
    ],
  };

  console.log("\nTest 2: 보안 이슈가 있는 API");
  const result2 = engine.validateDetailed(apiSpec);
  console.log(engine.formatValidationResult(result2));

  // Test 3: 타입 오류가 있는 Function
  const invalidFunctionSpec: V4Spec = {
    type: "function",
    declarations: [
      {
        type: "fn_declaration",
        properties: {
          parameter_types: ["invalid_type"],
          return_type: "also_invalid",
        },
      },
    ],
  };

  console.log("\nTest 3: 타입 오류");
  const result3 = engine.validateDetailed(invalidFunctionSpec);
  console.log(engine.formatValidationResult(result3));
}

// CLI 실행
if (require.main === module) {
  testValidation();
}
