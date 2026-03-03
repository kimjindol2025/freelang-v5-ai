/**
 * FreeLang v5 Code Emitter Interface
 * v4 형식 → 언어별 코드 생성
 */

import { V4Spec } from "../../Week2/src/v5-intent-parser";

/**
 * 모든 Emitter가 구현해야 하는 인터페이스
 */
export interface ICodeEmitter {
  /**
   * v4 명세를 특정 언어 코드로 변환
   */
  emit(spec: V4Spec): string;

  /**
   * 생성된 코드 포매팅
   */
  format(code: string): string;

  /**
   * 코드 유효성 검사
   */
  validate(code: string): boolean;
}

/**
 * 추상 기본 클래스
 */
export abstract class BaseEmitter implements ICodeEmitter {
  protected indent: string = "  ";
  protected lineWidth: number = 80;

  abstract emit(spec: V4Spec): string;

  format(code: string): string {
    return code
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim();
  }

  validate(code: string): boolean {
    return code.length > 0 && !code.includes("undefined");
  }

  /**
   * 들여쓰기 추가
   */
  protected indentCode(code: string, level: number = 1): string {
    const indentation = this.indent.repeat(level);
    return code
      .split("\n")
      .map((line) => (line.trim() ? indentation + line : ""))
      .join("\n");
  }

  /**
   * 함수 서명 생성
   */
  protected generateFunctionSignature(
    name: string,
    params: string[],
    returnType: string
  ): string {
    return `${name}(${params.join(", ")}): ${returnType}`;
  }

  /**
   * 주석 생성
   */
  protected generateComment(text: string, style: "line" | "block" = "line"): string {
    if (style === "line") {
      return `// ${text}`;
    }
    return `/* ${text} */`;
  }
}
