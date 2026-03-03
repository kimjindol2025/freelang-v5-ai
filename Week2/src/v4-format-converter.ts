/**
 * FreeLang v4 Format Converter
 * Intent → v4 형식 변환 규칙
 */

import { Intent, V4Spec, Declaration } from "./v5-intent-parser";

/**
 * v4 형식 변환기
 */
export class V4FormatConverter {
  /**
   * Intent를 v4 형식으로 변환
   */
  convert(intent: Intent): V4Spec {
    switch (intent.context) {
      case "function":
        return this.convertFunction(intent);
      case "server":
        return this.convertServer(intent);
      case "data":
        return this.convertData(intent);
      case "api":
        return this.convertAPI(intent);
      case "database":
        return this.convertDatabase(intent);
      case "security":
        return this.convertSecurity(intent);
      default:
        return this.convertDefault(intent);
    }
  }

  /**
   * Function Intent → v4
   *
   * 규칙:
   * fn name(inputs) → output { ... }
   */
  private convertFunction(intent: Intent): V4Spec {
    const { name, inputs, output, description, logic } = intent.parameters;

    return {
      type: "function",
      name: name,
      declarations: [
        {
          type: "fn_declaration",
          name: name,
          value: `fn ${name}(${this.formatInputs(inputs)}) → ${output} {
  // ${description || ""}
  ${logic || "// TODO: implement"}
}`,
          properties: {
            function_name: name,
            parameter_types: inputs || [],
            return_type: output,
            description: description || "",
          },
        },
      ],
      metadata: intent.metadata,
    };
  }

  /**
   * Server Intent → v4
   *
   * 규칙:
   * server {
   *   port: 8080
   *   routes: [endpoint*]
   * }
   */
  private convertServer(intent: Intent): V4Spec {
    const { port, type, framework, endpoints } = intent.parameters;

    const routeDeclarations: Declaration[] = (endpoints || []).map(
      (ep: any, index: number) => ({
        type: "endpoint",
        name: `${ep.method}_${ep.path}`,
        value: `${ep.method} ${ep.path}`,
        properties: {
          method: ep.method,
          path: ep.path,
          description: ep.description || "",
          handler: `handler_${index}`,
        },
      })
    );

    return {
      type: "server",
      declarations: [
        {
          type: "server_declaration",
          name: "server",
          value: `server {
  port: ${port}
  type: "${type}"
  framework: "${framework}"
}`,
          properties: {
            port: port || 8080,
            server_type: type || "rest_api",
            framework: framework || "express",
            endpoint_count: endpoints?.length || 0,
          },
        },
        ...routeDeclarations,
      ],
      metadata: intent.metadata,
    };
  }

  /**
   * Data Intent → v4
   *
   * 규칙:
   * data {
   *   input: array<T>
   *   operation: filter | map | reduce
   *   output: array<U>
   * }
   */
  private convertData(intent: Intent): V4Spec {
    const { input_type, operation, filter_condition, description } =
      intent.parameters;

    return {
      type: "data",
      declarations: [
        {
          type: "data_operation",
          value: `data {
  input: ${input_type}
  operation: "${operation}"
  condition: "${filter_condition || ""}"
}`,
          properties: {
            input_type: input_type,
            operation: operation,
            filter: filter_condition || null,
            description: description || "",
          },
        },
      ],
      metadata: intent.metadata,
    };
  }

  /**
   * API Intent → v4
   *
   * 규칙:
   * api {
   *   version: "1.0"
   *   endpoints: [...]
   *   auth: oauth2 | jwt | basic
   * }
   */
  private convertAPI(intent: Intent): V4Spec {
    const { version, endpoints, auth, base_path } = intent.parameters;

    return {
      type: "api",
      declarations: [
        {
          type: "api_definition",
          value: `api {
  version: "${version || "1.0"}"
  base_path: "${base_path || "/api"}"
  auth: "${auth || "none"}"
}`,
          properties: {
            version: version || "1.0",
            base_path: base_path || "/api",
            auth_type: auth || "none",
            endpoint_count: endpoints?.length || 0,
          },
        },
      ],
      metadata: intent.metadata,
    };
  }

  /**
   * Database Intent → v4
   *
   * 규칙:
   * database {
   *   type: mysql | postgres | mongodb
   *   schema: {...}
   * }
   */
  private convertDatabase(intent: Intent): V4Spec {
    const { db_type, tables, description } = intent.parameters;

    return {
      type: "database",
      declarations: [
        {
          type: "database_schema",
          value: `database {
  type: "${db_type || "postgres"}"
  tables: ${tables?.length || 0}
}`,
          properties: {
            database_type: db_type || "postgres",
            table_count: tables?.length || 0,
            tables: tables || [],
            description: description || "",
          },
        },
      ],
      metadata: intent.metadata,
    };
  }

  /**
   * Security Intent → v4
   *
   * 규칙:
   * security {
   *   encryption: aes256 | rsa
   *   validation: input | output | both
   * }
   */
  private convertSecurity(intent: Intent): V4Spec {
    const { encryption, validation, rules } = intent.parameters;

    return {
      type: "security",
      declarations: [
        {
          type: "security_policy",
          value: `security {
  encryption: "${encryption || "aes256"}"
  validation: "${validation || "input"}"
}`,
          properties: {
            encryption: encryption || "aes256",
            validation_type: validation || "input",
            rules: rules || [],
          },
        },
      ],
      metadata: intent.metadata,
    };
  }

  /**
   * 기본 변환
   */
  private convertDefault(intent: Intent): V4Spec {
    return {
      type: intent.context,
      declarations: [
        {
          type: `${intent.context}_declaration`,
          value: `${intent.context} { ... }`,
          properties: intent.parameters,
        },
      ],
      metadata: intent.metadata,
    };
  }

  /**
   * 헬퍼: inputs 포맷
   */
  private formatInputs(inputs?: string[]): string {
    if (!inputs || inputs.length === 0) {
      return "";
    }

    return inputs
      .map((input, index) => {
        const paramName = String.fromCharCode(97 + index); // a, b, c, ...
        return `${paramName}: ${input}`;
      })
      .join(", ");
  }
}

/**
 * 변환 규칙 테스트
 */
export function testConversion() {
  const converter = new V4FormatConverter();

  // Test 1: Function
  const functionIntent: Intent = {
    action: "create",
    context: "function",
    parameters: {
      name: "add",
      inputs: ["int", "int"],
      output: "int",
      description: "두 수를 더합니다",
    },
  };

  console.log("Test 1: Function");
  const v4Function = converter.convert(functionIntent);
  console.log(JSON.stringify(v4Function, null, 2));
  console.log("");

  // Test 2: Server
  const serverIntent: Intent = {
    action: "create",
    context: "server",
    parameters: {
      port: 8080,
      type: "rest_api",
      framework: "express",
      endpoints: [
        { method: "GET", path: "/users", description: "사용자 조회" },
        { method: "POST", path: "/users", description: "사용자 생성" },
      ],
    },
  };

  console.log("Test 2: Server");
  const v4Server = converter.convert(serverIntent);
  console.log(JSON.stringify(v4Server, null, 2));
  console.log("");

  // Test 3: Data
  const dataIntent: Intent = {
    action: "analyze",
    context: "data",
    parameters: {
      input_type: "array<int>",
      operation: "filter",
      filter_condition: "x > 10",
      description: "10보다 큰 값 필터링",
    },
  };

  console.log("Test 3: Data");
  const v4Data = converter.convert(dataIntent);
  console.log(JSON.stringify(v4Data, null, 2));
}

// CLI 실행
if (require.main === module) {
  testConversion();
}
