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
  CLASS = "CLASS",
  NEW = "NEW",
  ASYNC = "ASYNC",
  AWAIT = "AWAIT",
  IMPORT = "IMPORT",
  EXPORT = "EXPORT",
  FROM = "FROM",
  AS = "AS",
  WHILE = "WHILE",
  FOR = "FOR",
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
  DOT = "DOT",
  STAR = "STAR",
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
      } else {
        // parseDeclaration()이 null을 반환하면 현재 토큰 건너뛰기
        // (무한 루프 방지)
        if (!this.isAtEnd()) {
          this.advance();
        }
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
        else if (ident === "class") type = TokenType.CLASS;
        else if (ident === "new") type = TokenType.NEW;
        else if (ident === "async") type = TokenType.ASYNC;
        else if (ident === "await") type = TokenType.AWAIT;
        else if (ident === "import") type = TokenType.IMPORT;
        else if (ident === "export") type = TokenType.EXPORT;
        else if (ident === "from") type = TokenType.FROM;
        else if (ident === "as") type = TokenType.AS;
        else if (ident === "while") type = TokenType.WHILE;
        else if (ident === "for") type = TokenType.FOR;
        else if (ident === "this") type = TokenType.IDENTIFIER; // "this"는 특수 식별자로 처리

        tokens.push({
          type,
          value: ident,
          line,
          column,
        });
        column += ident.length;
        continue;
      }

      // 연산자 및 구분자 (더 구체적인 패턴을 먼저 검사!)
      let type: TokenType | null = null;
      let value = char;

      // 2문자 연산자 먼저 검사
      if (char === "&" && code[i + 1] === "&") {
        type = TokenType.COMMA;
        value = "&&";
        i++;
      } else if (char === "|" && code[i + 1] === "|") {
        type = TokenType.COMMA;
        value = "||";
        i++;
      } else if (char === "=" && code[i + 1] === "=") {
        type = TokenType.COMMA;
        value = "==";
        i++;
      } else if (char === "!" && code[i + 1] === "=") {
        type = TokenType.COMMA;
        value = "!=";
        i++;
      } else if (char === "<" && code[i + 1] === "=") {
        type = TokenType.COMMA;
        value = "<=";
        i++;
      } else if (char === ">" && code[i + 1] === "=") {
        type = TokenType.COMMA;
        value = ">=";
        i++;
      } else if (char === "=" && code[i + 1] === ">") {
        type = TokenType.ARROW;
        value = "=>";
        i++;
      } else if (char === "-" && code[i + 1] === ">") {
        type = TokenType.ARROW;
        value = "->";
        i++;
      }
      // 단일 minus 처리 (else if가 아니라 그냥 처리)
      else if (char === "-") {
        type = TokenType.COMMA;
        value = "-";
      }
      // 1문자 연산자 및 구분자
      else if (char === "(") type = TokenType.LPAREN;
      else if (char === ")") type = TokenType.RPAREN;
      else if (char === "{") type = TokenType.LBRACE;
      else if (char === "}") type = TokenType.RBRACE;
      else if (char === "[") type = TokenType.LBRACKET;
      else if (char === "]") type = TokenType.RBRACKET;
      else if (char === ",") type = TokenType.COMMA;
      else if (char === ";") type = TokenType.COMMA;  // semicolon 무시 (연산자로 처리)
      else if (char === ":") type = TokenType.COLON;
      else if (char === ".") type = TokenType.DOT;
      else if (char === "+") type = TokenType.COMMA;  // 임시: 토큰으로 생성 (value에 저장)
      else if (char === "*") type = TokenType.STAR;   // "*" 는 STAR 토큰으로 처리
      else if (char === "/") type = TokenType.COMMA;
      else if (char === "%") type = TokenType.COMMA;
      else if (char === "<") type = TokenType.COMMA;
      else if (char === ">") type = TokenType.COMMA;
      else if (char === "!") type = TokenType.COMMA;
      else if (char === "=" && code[i + 1] !== ">") {
        type = TokenType.EQUALS;
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
    let isAsync = false;

    // async 키워드 감지
    if (token.type === TokenType.ASYNC) {
      this.advance(); // async 소비
      if (this.peek().type === TokenType.FN) {
        isAsync = true;
      } else {
        // async 뒤에 fn이 아니면 에러
        throw new Error(`async 뒤에 fn이 필요합니다 (받음: ${this.peek().value})`);
      }
    }

    const currentToken = this.peek();

    if (currentToken.type === TokenType.FN) {
      const decl = this.parseFunctionDeclaration();
      if (isAsync) {
        if (decl.properties) {
          decl.properties["is_async"] = true;
        } else {
          decl.properties = { is_async: true };
        }
      }
      return decl;
    } else if (currentToken.type === TokenType.VAR) {
      return this.parseVariableDeclaration();
    } else if (currentToken.type === TokenType.CLASS) {
      return this.parseClassDeclaration();
    } else if (currentToken.type === TokenType.IMPORT) {
      return this.parseImportStatement();
    } else if (currentToken.type === TokenType.EXPORT) {
      return this.parseExportStatement();
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

  /**
   * 클래스 선언 파싱
   * class Dog { var name; fn init(...) { ... } fn speak() { ... } }
   */
  private parseClassDeclaration(): Declaration {
    this.consume(TokenType.CLASS); // class
    const className = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.LBRACE); // {

    const fields: string[] = [];
    const methods: Declaration[] = [];

    while (this.peek().type !== TokenType.RBRACE && !this.isAtEnd()) {
      if (this.peek().type === TokenType.VAR) {
        // var fieldName: type;
        this.consume(TokenType.VAR);
        const fieldName = this.consume(TokenType.IDENTIFIER).value;
        // ':' 와 type 건너뛰기
        if (this.peek().type === TokenType.COLON) {
          this.consume(TokenType.COLON);
          this.consume(TokenType.IDENTIFIER); // type 버림
        }
        // ';' 건너뛰기 (COMMA 토큰으로 처리됨)
        if (this.peek().type === TokenType.COMMA) {
          this.consume(TokenType.COMMA);
        }
        fields.push(fieldName);
      } else if (this.peek().type === TokenType.FN) {
        // fn method(...) { ... }
        methods.push(this.parseFunctionDeclaration());
      } else {
        // 알 수 없는 토큰 건너뛰기
        this.advance();
      }
    }

    this.consume(TokenType.RBRACE); // }

    return {
      type: "class_declaration",
      name: className,
      properties: {
        fields,
        methods,
      },
    };
  }

  /**
   * import 문 파싱
   * import { name1, name2 } from "./module.v5"
   * import * as moduleName from "./module.v5"
   */
  private parseImportStatement(): Declaration {
    this.consume(TokenType.IMPORT);

    const specifiers: { name: string; alias?: string }[] = [];
    let namespace: string | undefined;

    // import * as name 형식
    if (this.peek().type === TokenType.STAR) {
      this.consume(TokenType.STAR);
      this.consume(TokenType.AS);
      namespace = this.consume(TokenType.IDENTIFIER).value;
    }
    // import { name1, name2, ... } 형식
    else if (this.peek().type === TokenType.LBRACE) {
      this.consume(TokenType.LBRACE);

      while (this.peek().type !== TokenType.RBRACE && !this.isAtEnd()) {
        const name = this.consume(TokenType.IDENTIFIER).value;
        let alias: string | undefined;

        // as로 별칭 제공
        if (this.peek().type === TokenType.AS) {
          this.consume(TokenType.AS);
          alias = this.consume(TokenType.IDENTIFIER).value;
        }

        specifiers.push({ name, alias });

        // 다음 항목이 있으면 쉼표 필요
        if (this.peek().type === TokenType.COMMA) {
          this.consume(TokenType.COMMA);
        }
      }

      this.consume(TokenType.RBRACE);
    }

    // from 키워드와 모듈 경로
    this.consume(TokenType.FROM);
    const fromPath = this.consume(TokenType.STRING).value;

    return {
      type: "import_statement",
      properties: {
        specifiers,
        from: fromPath,
        namespace,
      },
    };
  }

  /**
   * export 문 파싱
   * export fn name(...) { ... }
   * export var name = value
   * export class Name { ... }
   */
  private parseExportStatement(): Declaration {
    this.consume(TokenType.EXPORT);

    let decl: Declaration | null = null;

    if (this.peek().type === TokenType.FN) {
      decl = this.parseFunctionDeclaration();
    } else if (this.peek().type === TokenType.VAR) {
      decl = this.parseVariableDeclaration();
    } else if (this.peek().type === TokenType.CLASS) {
      decl = this.parseClassDeclaration();
    } else {
      throw new Error(`export 뒤에 fn/var/class가 필요합니다 (받음: ${this.peek().value})`);
    }

    // is_exported 플래그 설정
    if (decl) {
      if (!decl.properties) {
        decl.properties = {};
      }
      decl.properties["is_exported"] = true;
    }

    return decl;
  }

  /**
   * while 문 파싱
   * while (condition) { body }
   */
  private parseWhileStatement(): Declaration {
    this.consume(TokenType.WHILE); // while
    this.consume(TokenType.LPAREN); // (

    // 조건 파싱
    let condition = "";
    let parenDepth = 1;
    while (parenDepth > 0 && !this.isAtEnd()) {
      const token = this.peek();
      if (token.type === TokenType.LPAREN) {
        parenDepth++;
        condition += token.value + " ";
      } else if (token.type === TokenType.RPAREN) {
        parenDepth--;
        if (parenDepth > 0) {
          condition += token.value + " ";
        }
      } else {
        condition += token.value + " ";
      }
      this.advance();
    }

    // 공백 건너뛰기
    while (this.peek().type === TokenType.COMMA || /\s/.test(this.peek().value)) {
      if (this.peek().type === TokenType.LBRACE) break;
      this.advance();
    }

    this.consume(TokenType.LBRACE); // {

    // 본문 파싱
    let logic = "";
    let braceDepth = 1;
    while (braceDepth > 0 && !this.isAtEnd()) {
      const token = this.peek();
      if (token.type === TokenType.LBRACE) {
        braceDepth++;
        logic += token.value + " ";
      } else if (token.type === TokenType.RBRACE) {
        braceDepth--;
        if (braceDepth > 0) {
          logic += token.value + " ";
        }
      } else {
        logic += token.value + " ";
      }
      this.advance();
    }

    return {
      type: "while_statement",
      properties: {
        condition: condition.trim(),
        logic: logic.trim(),
      },
    };
  }

  /**
   * for 문 파싱
   * for (init; condition; update) { body }
   */
  private parseForStatement(): Declaration {
    this.consume(TokenType.FOR); // for
    this.consume(TokenType.LPAREN); // (

    // for 헤더 파싱 (init; condition; update)
    let headerParts: string[] = ["", "", ""];
    let partIdx = 0;
    let parenDepth = 1;

    while (parenDepth > 0 && !this.isAtEnd()) {
      const token = this.peek();
      if (token.type === TokenType.LPAREN) {
        parenDepth++;
        headerParts[partIdx] += token.value + " ";
      } else if (token.type === TokenType.RPAREN) {
        parenDepth--;
        if (parenDepth > 0) {
          headerParts[partIdx] += token.value + " ";
        }
      } else if (token.type === TokenType.COMMA && token.value === ";" && parenDepth === 1) {
        // 세미콜론으로 분리
        partIdx++;
        if (partIdx >= 3) break;
      } else {
        headerParts[partIdx] += token.value + " ";
      }
      this.advance();
    }

    const [initPart, condPart, updatePart] = headerParts.map((s) => s.trim());

    // 공백 건너뛰기
    while (this.peek().type === TokenType.COMMA || /\s/.test(this.peek().value)) {
      if (this.peek().type === TokenType.LBRACE) break;
      this.advance();
    }

    this.consume(TokenType.LBRACE); // {

    // 본문 파싱
    let logic = "";
    let braceDepth = 1;
    while (braceDepth > 0 && !this.isAtEnd()) {
      const token = this.peek();
      if (token.type === TokenType.LBRACE) {
        braceDepth++;
        logic += token.value + " ";
      } else if (token.type === TokenType.RBRACE) {
        braceDepth--;
        if (braceDepth > 0) {
          logic += token.value + " ";
        }
      } else {
        logic += token.value + " ";
      }
      this.advance();
    }

    return {
      type: "for_statement",
      properties: {
        init: initPart,
        condition: condPart,
        update: updatePart,
        logic: logic.trim(),
      },
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
