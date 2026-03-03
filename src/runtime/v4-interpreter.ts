/**
 * FreeLang v5 V4 Interpreter
 * v4 Specification을 직접 실행하는 런타임 엔진
 *
 * 구조:
 * v4 Spec → [함수 정의 등록] → [실행 엔진] → 결과
 */

import { V4Spec, Declaration } from "../../Week2/src/v5-intent-parser";

/**
 * 실행 환경 (Context)
 */
interface ExecutionContext {
  variables: Map<string, any>;
  functions: Map<string, Function>;
  returnValue?: any;
  callStack: string[];
}

/**
 * v4 Interpreter 클래스
 */
export class V4Interpreter {
  private context: ExecutionContext;

  constructor() {
    this.context = {
      variables: new Map(),
      functions: new Map(),
      callStack: [],
    };

    // 기본 내장 함수들
    this.registerBuiltins();
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
    switch (decl.type) {
      case "fn_declaration":
        return this.executeFunctionDeclaration(decl);
      case "var_declaration":
        return this.executeVariableDeclaration(decl);
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
        if (name === "fib") {
          console.log(`[PARAM] ${name}: ${paramName} = ${paramValue}`);
        }
        this.context.variables.set(paramName, paramValue);
      });

      // 함수 로직 실행
      let result: any;
      try {
        if (name === "main") {
          console.log(`🔧 main() 실행: logic = "${logic.substring(0, 50)}..."`);
        }
        result = this.executeLogic(logic, args);
        if (name === "main") {
          console.log(`✅ main() 결과: ${result}`);
        }
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
    return this.executeBlock(logic);
  }

  /**
   * 블록 실행 (여러 문장, if/while 포함)
   */
  private executeBlock(block: string): any {
    let pos = 0;
    let result: any;

    while (pos < block.length) {
      // 공백 건너뛰기
      while (pos < block.length && /\s/.test(block[pos])) pos++;
      if (pos >= block.length) break;

      // if 문 감지
      if (block.substring(pos).startsWith("if")) {
        const ifResult = this.parseAndExecuteIf(block, pos);
        result = ifResult.result;
        pos = ifResult.nextPos;
        if (this.context.returnValue !== undefined) return result;
        continue;
      }

      // return 문 감지
      if (block.substring(pos).startsWith("return")) {
        const semiPos = block.indexOf(";", pos);
        const returnExpr = block.substring(pos + 6, semiPos >= 0 ? semiPos : undefined).trim();
        result = this.evaluateExpression(returnExpr);
        this.context.returnValue = result;
        return result;
      }

      // var 선언 감지
      if (block.substring(pos).startsWith("var")) {
        const semiPos = block.indexOf(";", pos);
        if (semiPos >= 0) {
          const varStmt = block.substring(pos, semiPos).trim();
          const eqPos = varStmt.indexOf("=");
          if (eqPos > 0) {
            const varName = varStmt.substring(3, eqPos).trim();
            const varValue = this.evaluateExpression(varStmt.substring(eqPos + 1).trim());
            this.context.variables.set(varName, varValue);
            result = varValue;
          }
          pos = semiPos + 1;
          continue;
        }
      }

      // 일반 문장 (함수 호출 등)
      const semiPos = block.indexOf(";", pos);
      if (semiPos >= 0) {
        const stmt = block.substring(pos, semiPos).trim();
        if (stmt) {
          try {
            result = this.evaluateExpression(stmt);
          } catch (e) {
            console.error(`⚠️  실행 실패: ${stmt}`);
          }
        }
        pos = semiPos + 1;
      } else {
        break;
      }
    }

    return result;
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
   * 괄호 균형을 맞춰서 함수 호출 감지
   * 예: "fib(n-1)" → {funcName: "fib", argsStr: "n-1", isSimpleCall: true}
   * 예: "fib(n-1) + fib(n-2)" → null (단순 함수 호출이 아님)
   */
  private extractSimpleFunctionCall(str: string): { funcName: string; argsStr: string } | null {
    const match = str.match(/^(\w+)\(/);
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

    // 불필요한 공백 제거 (함수 호출에서 "print ( x )" → "print(x)")
    let trimmed = expr.trim().replace(/;$/, "");
    trimmed = trimmed.replace(/\s*\(\s*/g, "(").replace(/\s*\)\s*/g, ")").replace(/\s*,\s*/g, ",");

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

    // 4. 함수 호출 (func(...))
    const funcCall = this.extractSimpleFunctionCall(trimmed);
    if (funcCall) {
      const funcName = funcCall.funcName;
      const argsStr = funcCall.argsStr;
      const fn = this.context.functions.get(funcName);

      if (fn) {
        // bracket-aware argument split
        if (funcName === "fib") {
          console.log(`[ARGS] argsStr="${argsStr}"`);
        }
        const splitArgs = argsStr ? this.splitArguments(argsStr) : [];
        if (funcName === "fib") {
          console.log(`[SPLIT] ${splitArgs.map(s => `"${s}"`).join(", ")}`);
        }
        const callArgs = splitArgs.map((arg) => {
          const trimmed = arg.trim();
          const evaluated = this.evaluateExpression(trimmed, args);
          if (funcName === "fib") {
            console.log(`  [EVAL] "${trimmed}" → ${evaluated}`);
          }
          return evaluated;
        });
        if (funcName === "fib") {
          console.log(`[CALL] ${funcName}(${callArgs.join(", ")})`);
        }
        return fn(...callArgs);
      }
    }

    // 5. 이항 연산 (산술, 비교, 논리)
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

    // 산술 & 비교 연산자 - 순서대로 시도
    const operators = ["<=", ">=", "==", "!=", "<", ">", "%", "+", "-", "*", "/"];
    for (const opStr of operators) {
      const escapedOp = opStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex1 = new RegExp(`^(.+?)\\s*${escapedOp}\\s*(.+)$`);
      const regex2 = new RegExp(`^(.+?)${escapedOp}(.+)$`);

      binaryMatch = trimmed.match(regex1) || trimmed.match(regex2);
      if (binaryMatch) {
        const left = this.evaluateExpression(binaryMatch[1], args);
        const op = opStr;
        const right = this.evaluateExpression(binaryMatch[2], args);

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
    }

    // 6. 템플릿 리터럴 (`...`)
    if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
      const template = trimmed.slice(1, -1);
      return this.evaluateTemplate(template, args);
    }

    // 7. 변수 조회
    if (this.context.variables.has(trimmed)) {
      return this.context.variables.get(trimmed);
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
