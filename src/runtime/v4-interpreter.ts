/**
 * FreeLang v5 V4 Interpreter
 * v4 Specification을 직접 실행하는 런타임 엔진
 *
 * 구조:
 * v4 Spec → [함수 정의 등록] → [실행 엔진] → 결과
 */

import { V4Spec, Declaration } from "../../Week2/src/v5-intent-parser";

/**
 * 클래스 정의
 */
interface ClassDef {
  name: string;
  fields: string[];
  methods: Map<string, Function>;
}

/**
 * 실행 환경 (Context)
 */
interface ExecutionContext {
  variables: Map<string, any>;
  functions: Map<string, Function>;
  classes: Map<string, ClassDef>;
  exportedFunctions: Map<string, Function>;  // export fn
  modules: Map<string, any>;  // 로드된 모듈 캐시
  returnValue?: any;
  callStack: string[];
}

/**
 * v4 Interpreter 클래스
 */
export class V4Interpreter {
  private context: ExecutionContext;
  private moduleLoader?: (path: string) => any;  // 모듈 로더 콜백

  constructor() {
    this.context = {
      variables: new Map(),
      functions: new Map(),
      classes: new Map(),
      exportedFunctions: new Map(),
      modules: new Map(),
      callStack: [],
    };

    // 기본 내장 함수들
    this.registerBuiltins();
  }

  /**
   * 모듈 로더 설정 (runtime.ts에서 호출)
   */
  setModuleLoader(loader: (path: string) => any): void {
    this.moduleLoader = loader;
  }

  /**
   * 내장 함수 등록
   */
  private registerBuiltins(): void {
    // 산술 연산
    this.context.functions.set("add", (a: number, b: number) => a + b);
    this.context.functions.set("subtract", (a: number, b: number) => a - b);
    this.context.functions.set("multiply", (a: number, b: number) => a * b);
    this.context.functions.set("divide", (a: number, b: number) => a / b);

    // 문자열 연산
    this.context.functions.set("concat", (a: string, b: string) => a + b);
    this.context.functions.set("length", (s: string) => s.length);
    this.context.functions.set("toUpperCase", (s: string) => s.toUpperCase());
    this.context.functions.set("toLowerCase", (s: string) => s.toLowerCase());

    // 타입 변환
    this.context.functions.set("toString", (v: any) => String(v));
    this.context.functions.set("toNumber", (v: any) => Number(v));
    this.context.functions.set("toBoolean", (v: any) => Boolean(v));

    // 배열 연산
    this.context.functions.set("push", (arr: any[], val: any) => {
      arr.push(val);
      return arr;
    });
    this.context.functions.set("pop", (arr: any[]) => arr.pop());
    this.context.functions.set("length", (arr: any[]) => arr.length);
    this.context.functions.set("map", (arr: any[], fn: Function) =>
      arr.map((x) => fn(x))
    );
    this.context.functions.set("filter", (arr: any[], fn: Function) =>
      arr.filter((x) => fn(x))
    );

    // 출력
    this.context.functions.set("print", (...args: any[]) => {
      console.log(...args);
      return args[args.length - 1];
    });
    this.context.functions.set("log", (...args: any[]) => {
      console.log(...args);
      return args[args.length - 1];
    });

    // 조건
    this.context.functions.set("if", (cond: boolean, trueFn: Function, falseFn?: Function) => {
      return cond ? trueFn() : falseFn ? falseFn() : null;
    });
  }

  /**
   * v4 Spec 실행
   */
  execute(spec: V4Spec): any {
    console.log(`\n🚀 v4 Interpreter: "${spec.name || spec.type}" 실행\n`);

    // 선언문들 처리
    if (spec.declarations && spec.declarations.length > 0) {
      for (const decl of spec.declarations) {
        this.executeDeclaration(decl);
      }
    }

    return this.context.returnValue;
  }

  /**
   * 선언문 실행
   */
  private executeDeclaration(decl: Declaration): any {
    // export 문 처리 (내부적으로는 선언만 함)
    if (decl.type === "fn_declaration" && decl.properties?.["is_exported"]) {
      const result = this.executeFunctionDeclaration(decl);
      const fnName = decl.name || "anonymous";
      const fn = this.context.functions.get(fnName);
      if (fn) {
        this.context.exportedFunctions.set(fnName, fn);
        console.log(`   ✅ 함수 export: ${fnName}`);
      }
      return result;
    }
    if (decl.type === "var_declaration" && decl.properties?.["is_exported"]) {
      const result = this.executeVariableDeclaration(decl);
      const varName = decl.name || "var";
      const value = this.context.variables.get(varName);
      this.context.exportedFunctions.set(varName, () => value);
      console.log(`   ✅ 변수 export: ${varName}`);
      return result;
    }
    if (decl.type === "class_declaration" && decl.properties?.["is_exported"]) {
      const result = this.executeClassDeclaration(decl);
      const className = decl.name || "AnonymousClass";
      const classDef = this.context.classes.get(className);
      if (classDef) {
        this.context.exportedFunctions.set(className, classDef as any);
      }
      console.log(`   ✅ 클래스 export: ${className}`);
      return result;
    }

    switch (decl.type) {
      case "fn_declaration":
        return this.executeFunctionDeclaration(decl);
      case "var_declaration":
        return this.executeVariableDeclaration(decl);
      case "class_declaration":
        return this.executeClassDeclaration(decl);
      case "import_statement":
        return this.executeImportStatement(decl);
      case "expression":
        return this.evaluateExpression(decl.value);
      default:
        return null;
    }
  }

  /**
   * 함수 선언 실행
   */
  private executeFunctionDeclaration(decl: Declaration): void {
    const name = decl.name || "anonymous";
    const params = decl.properties?.["parameter_types"] || [];
    const logic = decl.properties?.["logic"] || decl.value || "";

    // 함수 생성
    const fn = (...args: any[]) => {
      // 함수 로컬 변수 저장
      const savedVars = new Map(this.context.variables);
      const savedReturnValue = this.context.returnValue;

      // returnValue 초기화 (새 함수 호출)
      this.context.returnValue = undefined;

      // 파라미터를 변수로 등록
      params.forEach((param: any, idx: number) => {
        const paramName = typeof param === "string" ? param : param.name;
        const paramValue = args[idx];
        this.context.variables.set(paramName, paramValue);
      });

      // 함수 로직 실행
      let result: any;
      try {
        result = this.executeLogic(logic, args);
      } catch (e) {
        // 에러 처리
        console.error(`❌ ${name}() 에러:`, (e as Error).message);
        result = null;
      }

      // 변수 복원 및 returnValue 복원
      this.context.variables = savedVars;
      this.context.returnValue = savedReturnValue;

      return result;
    };

    // 함수 등록
    this.context.functions.set(name, fn);

    console.log(`   ✅ 함수 등록: ${name}(${params.map((p: any) => typeof p === "string" ? p : p.name).join(", ")})`);
  }

  /**
   * 클래스 선언 실행
   */
  private executeClassDeclaration(decl: Declaration): void {
    const className = decl.name || "AnonymousClass";
    const fields = decl.properties?.["fields"] || [];
    const methodDecls = decl.properties?.["methods"] || [];

    const classDef: ClassDef = {
      name: className,
      fields,
      methods: new Map(),
    };

    // 메서드 등록
    for (const methodDecl of methodDecls) {
      const methodName = methodDecl.name || "anonymous";
      const params = methodDecl.properties?.["parameter_types"] || [];
      const logic = methodDecl.properties?.["logic"] || "";

      const method = (thisObj: any, ...args: any[]) => {
        // 메서드 로컬 변수 저장
        const savedVars = new Map(this.context.variables);
        const savedReturnValue = this.context.returnValue;
        this.context.returnValue = undefined;

        // this 설정
        this.context.variables.set("this", thisObj);

        // 파라미터 등록
        params.forEach((param: any, idx: number) => {
          const paramName = typeof param === "string" ? param : param.name;
          this.context.variables.set(paramName, args[idx]);
        });

        // 메서드 로직 실행
        let result: any;
        try {
          result = this.executeLogic(logic, args);
        } catch (e) {
          console.error(`❌ ${className}.${methodName}() 에러:`, (e as Error).message);
          result = null;
        }

        // 변수 복원
        this.context.variables = savedVars;
        this.context.returnValue = savedReturnValue;

        return result;
      };

      classDef.methods.set(methodName, method);
    }

    // 클래스 등록
    this.context.classes.set(className, classDef);
    console.log(`   ✅ 클래스 등록: ${className} (필드: ${fields.join(", ")}, 메서드: ${Array.from(classDef.methods.keys()).join(", ")})`);
  }

  /**
   * import 문 실행
   */
  private executeImportStatement(decl: Declaration): void {
    const properties = decl.properties || {};
    const specifiers = properties["specifiers"] || [];
    const from = properties["from"] || "";
    const namespace = properties["namespace"];

    console.log(`   📦 import { ${specifiers.map((s: any) => s.name).join(", ")} } from "${from}"`);

    // 모듈 로더가 설정되지 않으면 경고
    if (!this.moduleLoader) {
      console.warn(`   ⚠️  모듈 로더가 설정되지 않았습니다. import는 작동하지 않습니다.`);
      return;
    }

    try {
      // 모듈 로드
      const moduleExports = this.moduleLoader(from);

      if (namespace) {
        // import * as name 형식
        this.context.variables.set(namespace, moduleExports);
        console.log(`   ✅ 모듈 import: namespace "${namespace}"`);
      } else {
        // import { name1, name2 } 형식
        for (const spec of specifiers) {
          const importName = spec.name;
          const localName = spec.alias || importName;
          const exported = moduleExports[importName];

          if (exported) {
            if (typeof exported === "function") {
              this.context.functions.set(localName, exported);
            } else {
              this.context.variables.set(localName, exported);
            }
            console.log(`   ✅ import: ${importName} as ${localName}`);
          } else {
            console.warn(`   ⚠️  "${importName}"을(를) "${from}"에서 찾을 수 없습니다.`);
          }
        }
      }
    } catch (e) {
      console.error(`   ❌ 모듈 로드 실패: ${from}`, e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * 변수 선언 실행
   */
  private executeVariableDeclaration(decl: Declaration): void {
    const name = decl.name || "var";
    const value = this.evaluateExpression(decl.value);

    this.context.variables.set(name, value);
    console.log(`   ✅ 변수: ${name} = ${JSON.stringify(value)}`);
  }

  /**
   * 함수 로직 실행 (if 문 포함한 제어흐름 지원)
   */
  public executeLogic(logic: string, args: any[]): any {
    return this.executeBlock(logic, args);
  }

  /**
   * 블록 실행 (여러 문장, if/while 포함)
   */
  private executeBlock(block: string, args: any[] = []): any {
    if (block.includes("print") || block.includes("r1") || block.includes("r2")) {
    }

    // "this . field" → "this.field" 같은 공백 정규화
    block = block.replace(/\s*\.\s*/g, ".");

    let pos = 0;
    let result: any;

    while (pos < block.length) {
      // 공백 건너뛰기
      while (pos < block.length && /\s/.test(block[pos])) pos++;
      if (pos >= block.length) {
        if (block.includes("print") || block.includes("r1")) {
        }
        break;
      }


      // if 문 감지
      if (block.substring(pos).startsWith("if")) {
        const ifResult = this.parseAndExecuteIf(block, pos);
        result = ifResult.result;
        pos = ifResult.nextPos;
        if (this.context.returnValue !== undefined) return result;
        continue;
      }

      // while 문 감지
      if (block.substring(pos).startsWith("while")) {
        const whileResult = this.parseAndExecuteWhile(block, pos);
        result = whileResult.result;
        pos = whileResult.nextPos;
        if (this.context.returnValue !== undefined) return result;
        continue;
      }

      // for 문 감지
      if (block.substring(pos).startsWith("for")) {
        const forResult = this.parseAndExecuteFor(block, pos);
        result = forResult.result;
        pos = forResult.nextPos;
        if (this.context.returnValue !== undefined) return result;
        continue;
      }

      // return 문 감지
      if (block.substring(pos).startsWith("return")) {
        const semiPos = block.indexOf(";", pos);
        const returnExpr = block.substring(pos + 6, semiPos >= 0 ? semiPos : undefined).trim();
        result = this.evaluateExpression(returnExpr, args);
        this.context.returnValue = result;
        return result;
      }

      const nextPart = block.substring(pos, Math.min(pos + 30, block.length));
      if (block.includes("print") && (nextPart.includes("print") || pos > 30)) {
      }

      // var 선언 감지
      if (block.substring(pos).startsWith("var")) {
        const semiPos = block.indexOf(";", pos);
        if (semiPos >= 0) {
          const varStmt = block.substring(pos, semiPos).trim();
          const eqPos = varStmt.indexOf("=");
          if (eqPos > 0) {
            const varName = varStmt.substring(3, eqPos).trim();
            const varValue = this.evaluateExpression(varStmt.substring(eqPos + 1).trim(), args);
            this.context.variables.set(varName, varValue);
            if (varName === "r1" || varName === "r2" || varName === "x" || varName === "result") {
              if (this.context.returnValue !== undefined) {
              }
            }
            result = varValue;
          }
          pos = semiPos + 1;
          continue;
        }
      }

      // this.field = expr 대입 감지
      if (block.substring(pos).startsWith("this.")) {
        const semiPos = block.indexOf(";", pos);
        if (semiPos >= 0) {
          const stmt = block.substring(pos, semiPos).trim();
          const eqIdx = stmt.indexOf("=");
          if (eqIdx > 0 && stmt[eqIdx + 1] !== "=") {
            // != "==" 구분
            const lhs = stmt.substring(0, eqIdx).trim(); // "this.fieldName"
            const rhs = this.evaluateExpression(stmt.substring(eqIdx + 1).trim(), args);
            const propName = lhs.split(".")[1];
            const thisObj = this.context.variables.get("this");
            if (thisObj) {
              thisObj[propName] = rhs;
              result = rhs;
            }
            pos = semiPos + 1;
            continue;
          }
        }
      }

      // 변수 대입 감지 (i = i + 1, x = 5, 등)
      // 일반 문장에서 "=" 기호를 찾음 ("==" 는 제외)
      const semiPos = block.indexOf(";", pos);
      if ((block.substring(pos).includes("print") || block.substring(pos).includes("r")) && pos > 20) {
      }
      if (semiPos >= 0) {
        const stmt = block.substring(pos, semiPos).trim();
        if (stmt.startsWith("print") && pos > 20) {
        }
        if (stmt) {
          // "=" 가 있는지 확인 ("==" 제외, 따옴표 안의 "=" 제외)
          let eqIdx = -1;
          let inQuote = false;
          let quoteChar = "";
          for (let i = 0; i < stmt.length; i++) {
            const char = stmt[i];
            if ((char === '"' || char === "'" || char === "`") && (i === 0 || stmt[i - 1] !== "\\")) {
              if (!inQuote) {
                inQuote = true;
                quoteChar = char;
              } else if (char === quoteChar) {
                inQuote = false;
              }
            }
            if (!inQuote && char === "=" && i > 0 && stmt[i + 1] !== "=" && stmt[i - 1] !== "!" && stmt[i - 1] !== "<" && stmt[i - 1] !== ">") {
              eqIdx = i;
              break;
            }
          }

          // 함수 호출과 변수 대입 구분
          // "="이전에 '('가 있으면 함수 호출 (예: print(...), add(...))
          const isAssignment = eqIdx > 0 && stmt.substring(0, eqIdx).indexOf("(") < 0;

          if (isAssignment) {
            // 변수 대입
            const varName = stmt.substring(0, eqIdx).trim();
            const rhs = this.evaluateExpression(stmt.substring(eqIdx + 1).trim(), args);
            this.context.variables.set(varName, rhs);
            result = rhs;
          } else {
            if (stmt.startsWith("print")) {
            }
            try {
              result = this.evaluateExpression(stmt, args);
              if (stmt.startsWith("print")) {
              }
            } catch (e) {
              console.error(`⚠️  실행 실패: ${stmt}`);
            }
          }
        }
        pos = semiPos + 1;
      } else {
        const remainingBlock = block.substring(pos);
        if (remainingBlock.includes("print") || remainingBlock.includes("r")) {
        }
        break;
      }
    }

    return result;
  }

  /**
   * 괄호 내용 추출: pos는 현재 위치, '(' 를 찾아서 내용 추출
   */
  private extractParenContent(block: string, pos: number): { content: string; nextPos: number } {
    while (pos < block.length && block[pos] !== "(") pos++;
    let depth = 1;
    pos++;
    let content = "";
    while (pos < block.length && depth > 0) {
      if (block[pos] === "(") depth++;
      else if (block[pos] === ")") {
        depth--;
        if (depth === 0) break;
      }
      content += block[pos++];
    }
    return { content: content.trim(), nextPos: pos + 1 };
  }

  /**
   * 중괄호 내용 추출: pos는 현재 위치, '{' 를 찾아서 내용 추출
   */
  private extractBraceContent(block: string, pos: number): { content: string; nextPos: number } {
    while (pos < block.length && block[pos] !== "{") pos++;
    let depth = 1;
    pos++;
    let content = "";
    while (pos < block.length && depth > 0) {
      if (block[pos] === "{") depth++;
      else if (block[pos] === "}") {
        depth--;
        if (depth === 0) break;
      }
      content += block[pos++];
    }
    return { content: content.trim(), nextPos: pos + 1 };
  }

  /**
   * if 문 파싱 및 실행
   */
  private parseAndExecuteIf(block: string, startPos: number): { result: any; nextPos: number } {
    let pos = startPos + 2; // "if" 건너뛰기

    // 공백 건너뛰고 (
    while (pos < block.length && (block[pos] === " " || block[pos] === "\t")) pos++;
    if (block[pos] !== "(") return { result: undefined, nextPos: pos };
    pos++; // ( 건너뛰기

    // 조건 추출 (괄호 짝 찾기)
    let depth = 1;
    let condStart = pos;
    while (pos < block.length && depth > 0) {
      if (block[pos] === "(") depth++;
      else if (block[pos] === ")") depth--;
      if (depth > 0) pos++;
    }
    const condition = block.substring(condStart, pos).trim();
    pos++; // ) 건너뛰기

    // 공백 건너뛰고 {
    while (pos < block.length && (block[pos] === " " || block[pos] === "\t" || block[pos] === "\n")) pos++;
    if (block[pos] !== "{") {
      // 중괄호 없이 단일 문장 (if (cond) return x;)
      const semiPos = block.indexOf(";", pos);
      const thenStmt = block.substring(pos, semiPos >= 0 ? semiPos : undefined).trim();
      const condResult = this.evaluateExpression(condition);
      let result: any;
      if (condResult) {
        result = this.executeBlock(thenStmt + ";");
      }
      return { result, nextPos: semiPos >= 0 ? semiPos + 1 : block.length };
    }

    pos++; // { 건너뛰기

    // then 블록 추출 (중괄호 짝 찾기)
    depth = 1;
    let thenStart = pos;
    while (pos < block.length && depth > 0) {
      if (block[pos] === "{") depth++;
      else if (block[pos] === "}") depth--;
      if (depth > 0) pos++;
    }
    const thenBlock = block.substring(thenStart, pos).trim();
    pos++; // } 건너뛰기

    // else 블록 확인
    let elseBlock = "";
    let nextPos = pos;
    while (pos < block.length && (block[pos] === " " || block[pos] === "\t" || block[pos] === "\n")) pos++;
    if (block.substring(pos).startsWith("else")) {
      pos += 4; // "else" 건너뛰기
      while (pos < block.length && (block[pos] === " " || block[pos] === "\t" || block[pos] === "\n")) pos++;
      if (block[pos] === "{") {
        pos++; // { 건너뛰기
        depth = 1;
        let elseStart = pos;
        while (pos < block.length && depth > 0) {
          if (block[pos] === "{") depth++;
          else if (block[pos] === "}") depth--;
          if (depth > 0) pos++;
        }
        elseBlock = block.substring(elseStart, pos).trim();
        pos++; // } 건너뛰기
        nextPos = pos;
      }
    }

    // 조건 평가 및 실행
    const condResult = this.evaluateExpression(condition);
    let result: any;
    if (condResult) {
      result = this.executeBlock(thenBlock);
    } else if (elseBlock) {
      result = this.executeBlock(elseBlock);
    }

    return { result, nextPos };
  }

  /**
   * while 문 파싱 및 실행
   */
  private parseAndExecuteWhile(block: string, startPos: number): { result: any; nextPos: number } {
    let pos = startPos + 5; // "while" 건너뛰기

    // 공백 건너뛰고 (
    while (pos < block.length && (block[pos] === " " || block[pos] === "\t")) pos++;
    if (block[pos] !== "(") return { result: undefined, nextPos: pos };
    pos++; // ( 건너뛰기

    // 조건 추출 (괄호 짝 찾기)
    let depth = 1;
    let condStart = pos;
    while (pos < block.length && depth > 0) {
      if (block[pos] === "(") depth++;
      else if (block[pos] === ")") depth--;
      if (depth > 0) pos++;
    }
    const condition = block.substring(condStart, pos).trim();
    pos++; // ) 건너뛰기

    // 공백 건너뛰고 {
    while (pos < block.length && (block[pos] === " " || block[pos] === "\t" || block[pos] === "\n")) pos++;
    if (block[pos] !== "{") {
      return { result: undefined, nextPos: pos };
    }

    pos++; // { 건너뛰기

    // 본문 추출 (중괄호 짝 찾기)
    depth = 1;
    let bodyStart = pos;
    while (pos < block.length && depth > 0) {
      if (block[pos] === "{") depth++;
      else if (block[pos] === "}") depth--;
      if (depth > 0) pos++;
    }
    const bodyBlock = block.substring(bodyStart, pos).trim();
    const closingBracePos = pos; // } 위치 저장
    pos++; // } 다음

    // while 루프 실행
    let result: any;
    let iterCount = 0;
    const maxIter = 10000; // 무한 루프 방지

    while (this.evaluateExpression(condition) && iterCount < maxIter) {
      result = this.executeBlock(bodyBlock, []); // args 전달
      iterCount++;

      // return 문으로 빠져나간 경우
      if (this.context.returnValue !== undefined) {
        break;
      }
    }

    if (iterCount >= maxIter) {
      console.warn(`⚠️  while 루프가 최대 반복(${maxIter})에 도달했습니다.`);
    }

    return { result, nextPos: pos };
  }

  /**
   * for 문 파싱 및 실행
   * for (init; condition; update) { body }
   */
  private parseAndExecuteFor(block: string, startPos: number): { result: any; nextPos: number } {
    let pos = startPos + 3; // "for" 건너뛰기

    // 공백 건너뛰고 (
    while (pos < block.length && (block[pos] === " " || block[pos] === "\t")) pos++;
    if (block[pos] !== "(") return { result: undefined, nextPos: pos };
    pos++; // ( 건너뛰기

    // for 헤더 파싱 (init; condition; update)
    let headerParts: string[] = ["", "", ""];
    let partIdx = 0;
    let parenDepth = 1;

    while (pos < block.length && parenDepth > 0) {
      if (block[pos] === "(") {
        parenDepth++;
        headerParts[partIdx] += block[pos];
      } else if (block[pos] === ")") {
        parenDepth--;
        if (parenDepth > 0) {
          headerParts[partIdx] += block[pos];
        }
      } else if (block[pos] === ";" && parenDepth === 1) {
        // 세미콜론으로 분리
        partIdx++;
        if (partIdx >= 3) break;
      } else {
        headerParts[partIdx] += block[pos];
      }
      pos++;
    }

    const [initPart, condPart, updatePart] = headerParts.map((s) => s.trim());

    // 공백 건너뛰고 {
    while (pos < block.length && (block[pos] === " " || block[pos] === "\t" || block[pos] === "\n")) pos++;
    if (block[pos] !== "{") {
      return { result: undefined, nextPos: pos };
    }

    pos++; // { 건너뛰기

    // 본문 추출 (중괄호 짝 찾기)
    let depth = 1;
    let bodyStart = pos;
    while (pos < block.length && depth > 0) {
      if (block[pos] === "{") depth++;
      else if (block[pos] === "}") depth--;
      if (depth > 0) pos++;
    }
    const bodyBlock = block.substring(bodyStart, pos).trim();
    pos++; // } 건너뛰기

    // for 루프 실행
    // 초기화 실행
    if (initPart) {
      this.executeBlock(initPart + ";", []); // args 전달
    }

    let result: any;
    let iterCount = 0;
    const maxIter = 10000; // 무한 루프 방지

    // 루프 실행
    while (this.evaluateExpression(condPart) && iterCount < maxIter) {
      result = this.executeBlock(bodyBlock, []); // args 전달
      iterCount++;

      // return 문으로 빠져나간 경우
      if (this.context.returnValue !== undefined) {
        break;
      }

      // 업데이트 실행
      if (updatePart) {
        this.executeBlock(updatePart + ";", []); // args 전달
      }
    }

    if (iterCount >= maxIter) {
      console.warn(`⚠️  for 루프가 최대 반복(${maxIter})에 도달했습니다.`);
    }

    return { result, nextPos: pos };
  }

  /**
   * 괄호를 고려한 이항 연산 분할
   * 예: "n * factorial(n - 1)" → { left: "n", op: "*", right: "factorial(n - 1)" }
   * "(" 안의 연산자는 무시함
   */
  private findBinaryOperator(
    expr: string,
    operators: string[]
  ): { left: string; op: string; right: string } | null {
    for (const opStr of operators) {
      // 괄호 깊이를 추적하면서 연산자 찾기
      let depth = 0;
      let opPos = -1;

      for (let i = expr.length - 1; i >= 0; i--) {
        const char = expr[i];

        if (char === ")" || char === "]" || char === "}") {
          depth++;
        } else if (char === "(" || char === "[" || char === "{") {
          depth--;
        } else if (depth === 0 && expr.substring(i, i + opStr.length) === opStr) {
          opPos = i;
          break; // 가장 오른쪽 (낮은 우선순위) 연산자 찾기
        }
      }

      if (opPos >= 0) {
        const left = expr.substring(0, opPos).trim();
        const right = expr.substring(opPos + opStr.length).trim();
        return { left, op: opStr, right };
      }
    }
    return null;
  }

  /**
   * 괄호 균형을 맞춰서 함수 호출 감지
   * 예: "fib(n-1)" → {funcName: "fib", argsStr: "n-1", isSimpleCall: true}
   * 예: "fib(n-1) + fib(n-2)" → null (단순 함수 호출이 아님)
   */
  private extractSimpleFunctionCall(str: string): { funcName: string; argsStr: string } | null {
    const match = str.match(/^(\w+)\s*\(/);  // 함수명과 ( 사이 공백 허용
    if (!match) return null;

    const funcName = match[1];
    const startIdx = str.indexOf("(");

    let depth = 1;
    let endIdx = startIdx + 1;

    while (endIdx < str.length && depth > 0) {
      if (str[endIdx] === "(") depth++;
      else if (str[endIdx] === ")") depth--;
      if (depth === 0) break;
      endIdx++;
    }

    if (depth !== 0) return null; // 괄호 균형 안 맞음

    // 괄호가 문자열 끝에서 닫혀야만 "단순 함수 호출"
    if (endIdx !== str.length - 1) return null;

    const argsStr = str.substring(startIdx + 1, endIdx);
    return { funcName, argsStr };
  }

  /**
   * 괄호를 고려한 인자 분할
   */
  private splitArguments(argsStr: string): string[] {
    const args: string[] = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];

      if (char === "(" || char === "[" || char === "{") {
        depth++;
        current += char;
      } else if (char === ")" || char === "]" || char === "}") {
        depth--;
        current += char;
      } else if (char === "," && depth === 0) {
        // top-level comma: argument separator
        args.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    if (current) {
      args.push(current);
    }

    return args;
  }

  /**
   * 식 평가
   */
  private evaluateExpression(expr: string, args?: any[]): any {
    if (!expr) return null;

    // 불필요한 공백 제거 (함수 호출에서 "print ( x )" → "print(x)" 및 "p . x" → "p.x")
    let trimmed = expr.trim().replace(/;$/, "");
    trimmed = trimmed
      .replace(/\s*\(\s*/g, "(")
      .replace(/\s*\)\s*/g, ")")
      .replace(/\s*,\s*/g, ",")
      .replace(/\s*\.\s*/g, "."); // "." 주위 space 제거

    // 0. await 키워드 처리 (동기 시뮬레이션: await expr → expr 평가)
    if (trimmed.startsWith("await")) {
      const awaitExpr = trimmed.substring(5).trim();
      return this.evaluateExpression(awaitExpr, args);
    }

    // 1. 리터럴 값
    if (trimmed === "null") return null;
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    if (/^["'`].*["'`]$/.test(trimmed)) {
      return trimmed.slice(1, -1);
    }

    // 2. 배열 리터럴
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const items = trimmed
        .slice(1, -1)
        .split(",")
        .map((item) => this.evaluateExpression(item.trim(), args));
      return items;
    }

    // 3. 객체 리터럴
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const obj: Record<string, any> = {};
      // 간단한 구현 (JSON으로 파싱 시도)
      try {
        return JSON.parse(trimmed);
      } catch {
        return obj;
      }
    }

    // 3.5. new ClassName(args) 연산자
    const newMatch = trimmed.match(/^new\s+(\w+)\s*\((.*)\)$/);
    if (newMatch) {
      const className = newMatch[1];
      const argsStr = newMatch[2];
      const classDef = this.context.classes.get(className);

      if (classDef) {
        // 인스턴스 생성
        const instance: Record<string, any> = { __class: className };

        // 필드 초기화
        for (const field of classDef.fields) {
          instance[field] = undefined;
        }

        // init 메서드 호출 (생성자)
        if (classDef.methods.has("init")) {
          const initMethod = classDef.methods.get("init")!;
          const callArgs = argsStr
            ? this.splitArguments(argsStr).map((arg) => this.evaluateExpression(arg.trim(), args))
            : [];
          initMethod(instance, ...callArgs);
        }

        return instance;
      }
    }

    // 4. obj.method(args) 메서드 호출
    const methodMatch = trimmed.match(/^(\w+)\.(\w+)\((.*)\)$/);
    if (methodMatch) {
      const objName = methodMatch[1];
      const methodName = methodMatch[2];
      const argsStr = methodMatch[3];

      const obj =
        objName === "this"
          ? this.context.variables.get("this")
          : this.context.variables.get(objName);

      if (obj?.__class) {
        const classDef = this.context.classes.get(obj.__class);
        const method = classDef?.methods.get(methodName);

        if (method) {
          const callArgs = argsStr
            ? this.splitArguments(argsStr).map((arg) => this.evaluateExpression(arg.trim(), args))
            : [];
          return method(obj, ...callArgs);
        }
      }
    }

    // 4.5. obj.field 프로퍼티 접근
    const propMatch = trimmed.match(/^(\w+)\.(\w+)$/);
    if (propMatch) {
      const objName = propMatch[1];
      const propName = propMatch[2];

      const obj =
        objName === "this"
          ? this.context.variables.get("this")
          : this.context.variables.get(objName);

      return obj?.[propName];
    }

    // 5. 함수 호출 (func(...))
    const funcCall = this.extractSimpleFunctionCall(trimmed);
    if (funcCall) {
      const funcName = funcCall.funcName;
      const argsStr = funcCall.argsStr;
      const fn = this.context.functions.get(funcName);

      if (fn) {
        // bracket-aware argument split
        const splitArgs = argsStr ? this.splitArguments(argsStr) : [];
        const callArgs = splitArgs.map((arg) => {
          const trimmed = arg.trim();
          const evaluated = this.evaluateExpression(trimmed, args);
          return evaluated;
        });
        return fn(...callArgs);
      }
    }

    // 6. 이항 연산 (산술, 비교, 논리)
    // 논리 && (높은 우선순위)
    let binaryMatch = trimmed.match(/^(.+?)\s*(&&)\s*(.+)$/);
    if (binaryMatch) {
      const left = this.evaluateExpression(binaryMatch[1], args);
      if (!left) return false;  // 단락 평가
      const right = this.evaluateExpression(binaryMatch[3], args);
      return left && right;
    }

    // 논리 ||
    binaryMatch = trimmed.match(/^(.+?)\s*(\|\|)\s*(.+)$/);
    if (binaryMatch) {
      const left = this.evaluateExpression(binaryMatch[1], args);
      if (left) return true;  // 단락 평가
      const right = this.evaluateExpression(binaryMatch[3], args);
      return left || right;
    }

    // 산술 & 비교 연산자 - 우선순위 낮은 것부터 검색
    // 낮은 우선순위부터 분할하면 자동으로 높은 우선순위가 먼저 계산됨
    const operators = [
      // 비교 (낮음)
      "<=", ">=", "==", "!=", "<", ">",
      // 덧셈/뺄셈
      "+", "-",
      // 곱셈/나눗셈/나머지 (높음)
      "%", "*", "/"
    ];

    const binaryOp = this.findBinaryOperator(trimmed, operators);
    if (binaryOp) {
      const left = this.evaluateExpression(binaryOp.left, args);
      const right = this.evaluateExpression(binaryOp.right, args);

      const op = binaryOp.op;
      switch (op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "%":
          return left % right;
        case "<":
          return left < right;
        case ">":
          return left > right;
        case "<=":
          return left <= right;
        case ">=":
          return left >= right;
        case "==":
          return left == right;
        case "!=":
          return left != right;
      }
    }

    // 6. 템플릿 리터럴 (`...`)
    if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
      const template = trimmed.slice(1, -1);
      return this.evaluateTemplate(template, args);
    }

    // 7. 변수 조회
    if (this.context.variables.has(trimmed)) {
      const val = this.context.variables.get(trimmed);
      if (trimmed === "r1" || trimmed === "r2" || trimmed === "x" || trimmed === "result") {
      }
      return val;
    }

    if (trimmed === "r1" || trimmed === "r2" || trimmed === "x" || trimmed === "result") {
    }

    return trimmed;
  }

  /**
   * 템플릿 리터럴 평가 (`${...}`)
   */
  private evaluateTemplate(template: string, args?: any[]): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, expr) => {
      const value = this.evaluateExpression(expr.trim(), args);
      return String(value);
    });
  }

  /**
   * 함수 호출
   */
  call(functionName: string, ...args: any[]): any {
    const fn = this.context.functions.get(functionName);
    if (!fn) {
      throw new Error(`함수를 찾을 수 없습니다: ${functionName}`);
    }
    return fn(...args);
  }

  /**
   * 변수 조회
   */
  getVariable(name: string): any {
    return this.context.variables.get(name);
  }

  /**
   * 변수 설정
   */
  setVariable(name: string, value: any): void {
    this.context.variables.set(name, value);
  }

  /**
   * 내보낸 함수들 조회
   */
  getExportedFunctions(): Map<string, any> {
    return this.context.exportedFunctions;
  }

  /**
   * 상태 출력
   */
  printState(): void {
    console.log("\n📊 실행 환경:");
    console.log("  변수:");
    this.context.variables.forEach((val, key) => {
      console.log(`    ${key} = ${JSON.stringify(val)}`);
    });
    console.log("  등록된 함수:", Array.from(this.context.functions.keys()).slice(0, 10).join(", "));
  }
}

/**
 * 테스트
 */
export function testV4Interpreter() {
  const interpreter = new V4Interpreter();

  // 테스트 1: 단순 계산
  const spec1: V4Spec = {
    type: "function",
    name: "calculator",
    declarations: [
      {
        type: "fn_declaration",
        name: "add",
        properties: {
          parameter_types: [{ name: "a", type: "number" }, { name: "b", type: "number" }],
          logic: "return a + b;",
        },
      },
    ],
  };

  console.log("🧪 Test 1: 함수 선언 및 호출");
  interpreter.execute(spec1);
  console.log(`  결과: 10 + 20 = ${interpreter.call("add", 10, 20)}`);

  // 테스트 2: 템플릿 리터럴
  console.log("\n🧪 Test 2: 템플릿 리터럴");
  const name = "FreeLang";
  const version = "v5";
  const msg = interpreter.executeLogic("`${name} ${version}`", [name, version]);
  console.log(`  결과: ${msg}`);
}
