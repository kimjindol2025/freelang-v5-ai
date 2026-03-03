/**
 * Type Inference Engine
 * 생성된 코드의 타입을 자동으로 추론하고 강화
 *
 * 기능:
 * 1. 변수의 타입 자동 추론
 * 2. 함수의 반환 타입 추론
 * 3. 타입 안정성 검증
 */

/**
 * 타입 추론 결과
 */
export interface TypeInferenceResult {
  variables: Map<string, string>;
  functions: Map<string, { params: string[]; returns: string }>;
  issues: string[];
}

/**
 * 타입 추론 엔진
 */
export class TypeInference {
  private inferredTypes: Map<string, string> = new Map();
  private functionSignatures: Map<string, any> = new Map();

  /**
   * 코드에서 타입 추론
   */
  inferTypes(code: string): TypeInferenceResult {
    this.inferredTypes.clear();
    this.functionSignatures.clear();

    const lines = code.split("\n");
    const issues: string[] = [];

    // 1. 변수 타입 추론
    for (const line of lines) {
      this.inferVariableTypes(line);
    }

    // 2. 함수 서명 추론
    for (const line of lines) {
      this.inferFunctionSignature(line);
    }

    // 3. 타입 안정성 검증
    for (const line of lines) {
      const typeIssues = this.validateTypeConsistency(line);
      issues.push(...typeIssues);
    }

    return {
      variables: this.inferredTypes,
      functions: this.functionSignatures,
      issues,
    };
  }

  /**
   * 변수 타입 추론
   */
  private inferVariableTypes(line: string): void {
    // TypeScript/JavaScript: const x = 10;
    let match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(\d+)(?:[^0-9]|$)/);
    if (match) {
      this.inferredTypes.set(match[1], "number");
      return;
    }

    // TypeScript/JavaScript: const x = "hello";
    match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*["'](.+?)["']/);
    if (match) {
      this.inferredTypes.set(match[1], "string");
      return;
    }

    // TypeScript/JavaScript: const x = true;
    match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(true|false)/);
    if (match) {
      this.inferredTypes.set(match[1], "boolean");
      return;
    }

    // TypeScript/JavaScript: const x = [1, 2, 3];
    match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*\[/);
    if (match) {
      this.inferredTypes.set(match[1], "array");
      return;
    }

    // TypeScript/JavaScript: const x = { key: "value" };
    match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*\{/);
    if (match) {
      this.inferredTypes.set(match[1], "object");
      return;
    }

    // C: int x = 10;
    match = line.match(/\b(int|float|double|char|bool|void)\s+(\w+)/);
    if (match) {
      this.inferredTypes.set(match[2], match[1]);
      return;
    }

    // Python: x = 10 (보다 복잡한 추론 필요하지만, 기본값 설정)
    match = line.match(/^(\w+)\s*=\s*(\d+)/);
    if (match) {
      this.inferredTypes.set(match[1], "int");
      return;
    }

    // Python: x = "hello"
    match = line.match(/^(\w+)\s*=\s*["'](.+?)["']/);
    if (match) {
      this.inferredTypes.set(match[1], "str");
      return;
    }
  }

  /**
   * 함수 서명 추론
   */
  private inferFunctionSignature(line: string): void {
    // function add(a: number, b: number): number
    let match = line.match(/function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*(\w+))?/);
    if (match) {
      const params = match[2]
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);
      this.functionSignatures.set(match[1], {
        params,
        returns: match[3] || "any",
      });
      return;
    }

    // def add(a: int, b: int) -> int:
    match = line.match(/def\s+(\w+)\s*\(([^)]*)\)\s*->\s*(\w+):/);
    if (match) {
      const params = match[2]
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);
      this.functionSignatures.set(match[1], {
        params,
        returns: match[3],
      });
      return;
    }

    // fn add(a: i32, b: i32) -> i32
    match = line.match(/fn\s+(\w+)\s*\(([^)]*)\)\s*->\s*(\w+)/);
    if (match) {
      const params = match[2]
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);
      this.functionSignatures.set(match[1], {
        params,
        returns: match[3],
      });
      return;
    }
  }

  /**
   * 타입 일관성 검증
   */
  private validateTypeConsistency(line: string): string[] {
    const issues: string[] = [];

    // 타입 불일치 감지 (기본적인 검증)
    // 예: const x: string = 10; (타입 에러)
    const match = line.match(/(\w+):\s*(string|number|boolean|int|float|bool)\s*=\s*(.+)/);
    if (match) {
      const varName = match[1];
      const declaredType = match[2];
      const value = match[3];

      // 간단한 타입 체크
      if (declaredType === "string" && /^\d+$/.test(value)) {
        issues.push(`Type mismatch in '${varName}': expected string, got number`);
      }
      if ((declaredType === "number" || declaredType === "int") && /^["']/.test(value)) {
        issues.push(`Type mismatch in '${varName}': expected number, got string`);
      }
    }

    return issues;
  }

  /**
   * 타입 강화 (명시적 타입 추가)
   */
  strengthenTypes(code: string): string {
    const lines = code.split("\n");
    const result: string[] = [];

    for (const line of lines) {
      let enhancedLine = line;

      // 타입 없는 변수 선언에 타입 추가
      const match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(.+)/);
      if (match && !line.includes(":")) {
        const varName = match[1];
        const value = match[2];

        const inferredType = this.inferTypeFromValue(value);
        if (inferredType && inferredType !== "any") {
          enhancedLine = line.replace(
            /(?:const|let|var)\s+(\w+)\s*=/,
            `const ${varName}: ${inferredType} =`
          );
        }
      }

      result.push(enhancedLine);
    }

    return result.join("\n");
  }

  /**
   * 값으로부터 타입 추론
   */
  private inferTypeFromValue(value: string): string {
    value = value.trim();

    if (/^\d+$/.test(value)) return "number";
    if (/^["'].*["']$/.test(value)) return "string";
    if (/(true|false)/.test(value)) return "boolean";
    if (/^\[/.test(value)) return "any[]";
    if (/^\{/.test(value)) return "Record<string, any>";

    return "any";
  }

  /**
   * 타입 추론 리포트 생성
   */
  generateInferenceReport(): string {
    return `
╔════════════════════════════════════════════════════════════════╗
║                  📝 타입 추론 리포트                             ║
╚════════════════════════════════════════════════════════════════╝

📊 추론된 타입:

변수 (${this.inferredTypes.size}개):
${Array.from(this.inferredTypes.entries())
  .map(([name, type]) => `  ${name.padEnd(20)} : ${type}`)
  .join("\n")}

함수 (${this.functionSignatures.size}개):
${Array.from(this.functionSignatures.entries())
  .map(([name, sig]) => `  ${name}(${sig.params.join(", ")}) -> ${sig.returns}`)
  .join("\n")}

✅ 타입 추론 완료!
════════════════════════════════════════════════════════════════
`;
  }
}

/**
 * 테스트
 */
export function testTypeInference() {
  const inference = new TypeInference();

  const testCode = `
function add(a, b) {
  const sum = a + b;
  const message = "Result: ";
  const isPositive = true;
  return sum;
}

const x = 10;
const y = "hello";
const z = [1, 2, 3];
`;

  console.log("입력 코드:");
  console.log(testCode);
  console.log("\n타입 추론 중...\n");

  const result = inference.inferTypes(testCode);

  console.log(inference.generateInferenceReport());

  if (result.issues.length > 0) {
    console.log("⚠️  발견된 타입 문제:");
    result.issues.forEach((issue) => console.log(`  - ${issue}`));
  } else {
    console.log("✅ 타입 일관성 검증 통과!");
  }

  console.log("\n타입 강화 중...\n");
  const strengthened = inference.strengthenTypes(testCode);
  console.log("강화된 코드:");
  console.log(strengthened);
}

// CLI 실행
if (require.main === module) {
  testTypeInference();
}
