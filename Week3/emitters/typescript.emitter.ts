/**
 * TypeScript Emitter
 * v4 형식 → TypeScript + Express.js 코드 생성
 */

import { V4Spec, Declaration } from "../../Week2/src/v5-intent-parser";
import { BaseEmitter } from "./emitter.interface";

export class TypeScriptEmitter extends BaseEmitter {
  /**
   * v4 명세를 TypeScript + Express 코드로 변환
   */
  emit(spec: V4Spec): string {
    switch (spec.type) {
      case "function":
        return this.emitFunction(spec);
      case "server":
        return this.emitServer(spec);
      case "api":
        return this.emitAPI(spec);
      case "data":
        return this.emitData(spec);
      case "database":
        return this.emitDatabase(spec);
      default:
        return this.emitDefault(spec);
    }
  }

  /**
   * Function 생성
   */
  private emitFunction(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const {
      function_name,
      parameter_types,
      return_type,
      description,
    } = decl.properties || {};

    const params = (parameter_types || [])
      .map((type: string, i: number) => `arg${i}: ${this.mapType(type)}`)
      .join(", ");

    const returnStmt = this.getTypeScriptReturnValue(return_type);

    const code = `
/**
 * ${description || "Generated function"}
 */
export function ${function_name || "generated"}(${params}): ${this.mapType(return_type || "void")} {
  // TODO: 함수 로직 구현
  ${returnStmt}
}
`.trim();

    return code;
  }

  /**
   * TypeScript 반환값 생성
   */
  private getTypeScriptReturnValue(returnType?: string): string {
    if (!returnType || returnType === "void") {
      return "";
    }
    if (returnType === "int" || returnType === "float") {
      return "return 0;";
    }
    if (returnType === "string") {
      return 'return "";';
    }
    if (returnType === "bool") {
      return "return false;";
    }
    if (returnType?.includes("array")) {
      return "return [];";
    }
    return 'return null as any;';
  }

  /**
   * Server 생성
   */
  private emitServer(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { port, server_type, framework, endpoint_count } =
      decl.properties || {};

    const endpoints = spec.declarations.slice(1).map((ep) => this.emitEndpoint(ep));

    const code = `
import express, { Express, Request, Response } from "express";

const app: Express = express();
const PORT = ${port || 8080};

${this.indentCode("// Middleware", 0)}
app.use(express.json());

${endpoints.join("\n\n")}

${this.indentCode("// Health check", 0)}
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

${this.indentCode("// Server start", 0)}
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export default app;
`.trim();

    return code;
  }

  /**
   * Endpoint 생성
   */
  private emitEndpoint(decl: Declaration): string {
    const { method, path, description, handler } = decl.properties || {};

    const methodLower = (method || "GET").toLowerCase();
    const responseCode = method === "POST" ? 201 : 200;

    return `app.${methodLower}("${path || "/"}", (req: Request, res: Response) => {
  // ${description || "Endpoint handler"}
  res.status(${responseCode}).json({ message: "Success" });
});`;
  }

  /**
   * API 정의 생성
   */
  private emitAPI(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { version, base_path, auth_type, endpoint_count } =
      decl.properties || {};

    const code = `
import express, { Express, Request, Response, NextFunction } from "express";

const app: Express = express();
const PORT = process.env.PORT || 8080;

${this.indentCode("// API Configuration", 0)}
const API_VERSION = "${version || "1.0"}";
const BASE_PATH = "${base_path || "/api"}";
const AUTH_TYPE = "${auth_type || "none"}";

${auth_type && auth_type !== "none" ? this.emitAuthMiddleware(auth_type) : ""}

${this.indentCode("// Middleware", 0)}
app.use(express.json());
${auth_type && auth_type !== "none" ? 'app.use(authMiddleware);' : ""}

${this.indentCode("// API Routes", 0)}
app.get(\`\${BASE_PATH}/health\`, (req: Request, res: Response) => {
  res.json({ status: "healthy", version: API_VERSION });
});

${this.indentCode("// Start server", 0)}
app.listen(PORT, () => {
  console.log(\`API Server v\${API_VERSION} listening on port \${PORT}\`);
});

export default app;
`.trim();

    return code;
  }

  /**
   * 인증 미들웨어 생성
   */
  private emitAuthMiddleware(authType: string): string {
    if (authType === "jwt") {
      return `
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  // JWT 검증 로직
  next();
};`;
    }
    if (authType === "oauth2") {
      return `
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  // OAuth2 검증 로직
  next();
};`;
    }
    return `
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Basic auth 검증 로직
  next();
};`;
  }

  /**
   * Data 처리 생성
   */
  private emitData(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { input_type, operation, filter, description } =
      decl.properties || {};

    const code = `
/**
 * ${description || "Data operation"}
 */
export function processData(input: ${this.mapType(input_type || "any[]")}): any {
  ${this.emitDataOperation(operation, filter)}
}
`.trim();

    return code;
  }

  /**
   * 데이터 연산 생성
   */
  private emitDataOperation(operation: string, filter?: string): string {
    switch (operation) {
      case "filter":
        return `return input.filter(x => ${filter || "true"});`;
      case "map":
        return `return input.map(x => x);`;
      case "reduce":
        return `return input.reduce((acc, x) => acc + x, 0);`;
      default:
        return `return input;`;
    }
  }

  /**
   * Database 생성
   */
  private emitDatabase(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { database_type, table_count, description } =
      decl.properties || {};

    const code = `
/**
 * Database Configuration
 * ${description || "Database setup"}
 */

import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "freelang_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

export const db = pool;

/**
 * Initialize database tables
 */
export async function initializeDatabase() {
  // TODO: Create ${table_count || 0} table(s)
  console.log("Database initialized");
}
`.trim();

    return code;
  }

  /**
   * 기본 생성
   */
  private emitDefault(spec: V4Spec): string {
    return `
/**
 * FreeLang v5 Generated Code
 * Type: ${spec.type}
 */

export const generated = {
  type: "${spec.type}",
  timestamp: new Date().toISOString(),
};
`.trim();
  }

  /**
   * v4 타입을 TypeScript 타입으로 매핑
   */
  private mapType(type: string): string {
    const typeMap: Record<string, string> = {
      int: "number",
      float: "number",
      string: "string",
      bool: "boolean",
      array: "any[]",
      "array<int>": "number[]",
      "array<string>": "string[]",
      "array<float>": "number[]",
      object: "Record<string, any>",
      void: "void",
      any: "any",
    };
    return typeMap[type] || "any";
  }
}
