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

      // 파라미터를 변수로 등록
      params.forEach((param: any, idx: number) => {
        const paramName = typeof param === "string" ? param : param.name;
        this.context.variables.set(paramName, args[idx]);
      });

      // 함수 로직 실행
      let result: any;
      try {
        result = this.executeLogic(logic, args);
      } catch (e) {
        // 에러 처리
        result = null;
      }

      // 변수 복원
      this.context.variables = savedVars;

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
   * 함수 로직 실행
   */
  public executeLogic(logic: string, args: any[]): any {
    // 간단한 로직 파싱 및 실행
    const trimmed = logic.trim();

    // return 문 처리
    if (trimmed.startsWith("return ")) {
      const expr = trimmed.substring(7).replace(/[;]$/, "");
      return this.evaluateExpression(expr, args);
    }

    // 직접 식 평가
    return this.evaluateExpression(trimmed, args);
  }

  /**
   * 식 평가
   */
  private evaluateExpression(expr: string, args?: any[]): any {
    if (!expr) return null;

    const trimmed = expr.trim().replace(/;$/, "");

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
    const funcCallMatch = trimmed.match(/^(\w+)\((.*)\)$/);
    if (funcCallMatch) {
      const funcName = funcCallMatch[1];
      const argsStr = funcCallMatch[2];
      const fn = this.context.functions.get(funcName);

      if (fn) {
        const callArgs = argsStr
          ? argsStr.split(",").map((arg) => this.evaluateExpression(arg.trim(), args))
          : [];
        return fn(...callArgs);
      }
    }

    // 5. 이항 연산 (a + b, a - b 등)
    const binaryMatch = trimmed.match(/^(.+?)\s*([\+\-\*\/])\s*(.+)$/);
    if (binaryMatch) {
      const left = this.evaluateExpression(binaryMatch[1], args);
      const op = binaryMatch[2];
      const right = this.evaluateExpression(binaryMatch[3], args);

      switch (op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
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
