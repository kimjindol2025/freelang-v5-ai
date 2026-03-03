/**
 * FreeLang v5 Parser
 * v5 소스코드 → v4 Spec 변환 및 실행
 *
 * v5 문법:
 * fn name(inputs) → output { logic }
 * var name = value
 * result = expression
 */

import { V4Spec, Declaration } from "../../Week2/src/v5-intent-parser";

/**
 * v5 토큰
 */
enum TokenType {
  FN = "FN",
  VAR = "VAR",
  ARROW = "ARROW",
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  LBRACE = "LBRACE",
  RBRACE = "RBRACE",
  LBRACKET = "LBRACKET",
  RBRACKET = "RBRACKET",
  COMMA = "COMMA",
  COLON = "COLON",
  EQUALS = "EQUALS",
  IDENTIFIER = "IDENTIFIER",
  STRING = "STRING",
  NUMBER = "NUMBER",
  EOF = "EOF",
}

interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/**
 * v5 Parser
 */
export class V5Parser {
  private tokens: Token[] = [];
  private current: number = 0;

  /**
   * v5 코드를 v4 Spec으로 파싱
   */
  parse(code: string): V4Spec {
    this.tokens = this.tokenize(code);
    this.current = 0;

    const declarations: Declaration[] = [];

    while (!this.isAtEnd()) {
      const decl = this.parseDeclaration();
      if (decl) {
        declarations.push(decl);
      }
    }

    return {
      type: "v5_program",
      declarations,
    };
  }

  /**
   * 토큰화
   */
  private tokenize(code: string): Token[] {
    const tokens: Token[] = [];
    let line = 1;
    let column = 1;
    let i = 0;

    while (i < code.length) {
      const char = code[i];

      // 공백 및 개행
      if (/\s/.test(char)) {
        if (char === "\n") {
          line++;
          column = 1;
        } else {
          column++;
        }
        i++;
        continue;
      }

      // 주석
      if (char === "/" && code[i + 1] === "/") {
        while (i < code.length && code[i] !== "\n") i++;
        continue;
      }

      // 문자열
      if (char === '"' || char === "'" || char === "`") {
        const quote = char;
        let str = "";
        i++;
        while (i < code.length && code[i] !== quote) {
          if (code[i] === "\\") {
            i++;
            str += code[i];
          } else {
            str += code[i];
          }
          i++;
        }
        i++;
        tokens.push({
          type: TokenType.STRING,
          value: str,
          line,
          column,
        });
        column += str.length + 2;
        continue;
      }

      // 숫자
      if (/\d/.test(char)) {
        let num = "";
        while (i < code.length && /[\d.]/.test(code[i])) {
          num += code[i];
          i++;
        }
        tokens.push({
          type: TokenType.NUMBER,
          value: num,
          line,
          column,
        });
        column += num.length;
        continue;
      }

      // 키워드 및 식별자
      if (/[a-zA-Z_]/.test(char)) {
        let ident = "";
        while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
          ident += code[i];
          i++;
        }

        let type = TokenType.IDENTIFIER;
        if (ident === "fn") type = TokenType.FN;
        else if (ident === "var") type = TokenType.VAR;

        tokens.push({
          type,
          value: ident,
          line,
          column,
        });
        column += ident.length;
        continue;
      }

      // 연산자 및 구분자
      let type: TokenType | null = null;
      let value = char;

      if (char === "(") type = TokenType.LPAREN;
      else if (char === ")") type = TokenType.RPAREN;
      else if (char === "{") type = TokenType.LBRACE;
      else if (char === "}") type = TokenType.RBRACE;
      else if (char === "[") type = TokenType.LBRACKET;
      else if (char === "]") type = TokenType.RBRACKET;
      else if (char === ",") type = TokenType.COMMA;
      else if (char === ":") type = TokenType.COLON;
      else if (char === "=" && code[i + 1] !== ">") {
        type = TokenType.EQUALS;
      } else if (char === "=" && code[i + 1] === ">") {
        type = TokenType.ARROW;
        value = "=>";
        i++;
      } else if (char === "-" && code[i + 1] === ">") {
        type = TokenType.ARROW;
        value = "->";
        i++;
      }

      if (type) {
        tokens.push({
          type,
          value,
          line,
          column,
        });
      }

      i++;
      column++;
    }

    tokens.push({
      type: TokenType.EOF,
      value: "",
      line,
      column,
    });

    return tokens;
  }

  /**
   * 선언문 파싱
   */
  private parseDeclaration(): Declaration | null {
    if (this.isAtEnd()) return null;

    const token = this.peek();

    if (token.type === TokenType.FN) {
      return this.parseFunctionDeclaration();
    } else if (token.type === TokenType.VAR) {
      return this.parseVariableDeclaration();
    }

    return null;
  }

  /**
   * 함수 선언 파싱
   * fn name(inputs) → output { logic }
   */
  private parseFunctionDeclaration(): Declaration {
    this.consume(TokenType.FN); // fn
    const name = this.consume(TokenType.IDENTIFIER).value; // name

    this.consume(TokenType.LPAREN); // (

    // 파라미터 파싱
    const params: any[] = [];
    if (this.peek().type !== TokenType.RPAREN) {
      do {
        if (this.peek().type === TokenType.COMMA) {
          this.consume(TokenType.COMMA);
        }
        const paramName = this.consume(TokenType.IDENTIFIER).value;
        let paramType = "any";

        if (this.peek().type === TokenType.COLON) {
          this.consume(TokenType.COLON);
          paramType = this.consume(TokenType.IDENTIFIER).value;
        }

        params.push({ name: paramName, type: paramType });
      } while (this.peek().type === TokenType.COMMA);
    }

    this.consume(TokenType.RPAREN); // )

    // 반환 타입 파싱
    let returnType = "void";

    // → 또는 -> 기호 처리
    if (this.peek().type === TokenType.ARROW ||
        (this.peek().type === TokenType.IDENTIFIER && this.peek().value === "→")) {
      this.advance(); // → or -> 건너뛰기
      if (this.peek().type !== TokenType.LBRACE) {
        returnType = this.consume(TokenType.IDENTIFIER).value;
      }
    }

    // 함수 본문 파싱
    if (this.peek().type !== TokenType.LBRACE) {
      throw new Error(`함수 본문이 필요합니다 (받음: ${this.peek().value}) at line ${this.peek().line}`);
    }
    this.consume(TokenType.LBRACE); // {
    let logic = "";
    while (this.peek().type !== TokenType.RBRACE && !this.isAtEnd()) {
      logic += this.peek().value + " ";
      this.advance();
    }
    this.consume(TokenType.RBRACE); // }

    return {
      type: "fn_declaration",
      name,
      properties: {
        parameter_types: params,
        return_type: returnType,
        logic: logic.trim(),
      },
    };
  }

  /**
   * 변수 선언 파싱
   * var name = value
   */
  private parseVariableDeclaration(): Declaration {
    this.consume(TokenType.VAR); // var
    const name = this.consume(TokenType.IDENTIFIER).value; // name
    this.consume(TokenType.EQUALS); // =

    let value = "";
    while (this.peek().type !== TokenType.EOF && !this.isTerminator()) {
      value += this.peek().value + " ";
      this.advance();
    }

    return {
      type: "var_declaration",
      name,
      value: value.trim(),
    };
  }

  // Helper 메서드들
  private peek(): Token {
    return this.tokens[this.current];
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(
        `예상한 토큰 ${type}를 받지 못함 (실제: ${token.type}) at line ${token.line}`
      );
    }
    return this.advance();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private isTerminator(): boolean {
    const type = this.peek().type;
    return (
      type === TokenType.RBRACE ||
      type === TokenType.RBRACKET ||
      type === TokenType.COMMA ||
      type === TokenType.EOF
    );
  }
}

/**
 * 테스트
 */
export function testV5Parser() {
  const parser = new V5Parser();

  const code = `
fn add(a: number, b: number) → number {
  return a + b;
}

fn greet(name: string) → string {
  return \`Hello, \${name}!\`;
}
`;

  console.log("🧪 v5 Parser Test");
  console.log("\n📝 v5 코드:");
  console.log(code);

  const spec = parser.parse(code);
  console.log("\n✅ 파싱된 v4 Spec:");
  console.log(JSON.stringify(spec, null, 2));
}
