/**
 * Rust Emitter
 * v4 형식 → Rust + Actix-web 코드 생성
 */

import { V4Spec, Declaration } from "../../Week2/src/v5-intent-parser";
import { BaseEmitter } from "./emitter.interface";

export class RustEmitter extends BaseEmitter {
  /**
   * v4 명세를 Rust + Actix-web 코드로 변환
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

    const code = `
/// ${description || "Generated function"}
fn ${function_name || "generated"}(${params}) -> ${this.mapType(return_type || "void")} {
    // TODO: 함수 로직 구현
    ${this.getReturnValue(return_type)}
}

fn main() {
    println!("Generated Rust function");
}
`.trim();

    return code;
  }

  /**
   * Server 생성 (Actix-web)
   */
  private emitServer(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { port, server_type, framework } = decl.properties || {};

    const endpoints = spec.declarations.slice(1).map((ep) => this.emitEndpoint(ep));

    const code = `
use actix_web::{web, App, HttpServer, HttpResponse, middleware};
use serde_json::json;

const PORT: u16 = ${port || 8080};

${endpoints.join("\n\n")}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(json!({
        "status": "ok",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Server listening on port {}", PORT);

    HttpServer::new(|| {
        App::new()
            .wrap(middleware::NormalizePath::trim())
            .route("/health", web::get().to(health_check))
            ${endpoints.map(() => '// .route(..., ...)').join("\n            ")}
    })
    .bind(("0.0.0.0", PORT))?
    .run()
    .await
}
`.trim();

    return code;
  }

  /**
   * Endpoint 생성
   */
  private emitEndpoint(decl: Declaration): string {
    const { method, path, description, handler } = decl.properties || {};

    const methodName = method?.toLowerCase() || "get";

    return `/// ${description || "Endpoint handler"}
async fn ${handler || `handle_${methodName}`}() -> HttpResponse {
    HttpResponse::Ok().json(json!({
        "message": "Success",
        "method": "${method}",
        "path": "${path}"
    }))
}`;
  }

  /**
   * API 정의 생성
   */
  private emitAPI(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { version, base_path, auth_type } = decl.properties || {};

    const code = `
use actix_web::{web, App, HttpServer, HttpResponse, middleware};
use serde_json::json;

const API_VERSION: &str = "${version || "1.0"}";
const BASE_PATH: &str = "${base_path || "/api"}";
${auth_type && auth_type !== "none" ? `const AUTH_TYPE: &str = "${auth_type}";` : ""}

${auth_type && auth_type !== "none" ? this.emitRustAuthMiddleware(auth_type) : ""}

async fn health() -> HttpResponse {
    HttpResponse::Ok().json(json!({
        "status": "healthy",
        "version": API_VERSION,
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("API Server v{} starting...", API_VERSION);
    println!("Base path: {}", BASE_PATH);

    HttpServer::new(|| {
        App::new()
            .route(&format!("{}/health", BASE_PATH), web::get().to(health))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
`.trim();

    return code;
  }

  /**
   * Rust 인증 미들웨어 생성
   */
  private emitRustAuthMiddleware(authType: string): string {
    if (authType === "jwt") {
      return `use jsonwebtoken::{decode, DecodingKey, Validation};

fn verify_token(token: &str) -> Result<(), Box<dyn std::error::Error>> {
    // TODO: JWT 검증 로직
    Ok(())
}`;
    }
    if (authType === "oauth2") {
      return `fn verify_oauth2(token: &str) -> Result<(), Box<dyn std::error::Error>> {
    // TODO: OAuth2 검증 로직
    Ok(())
}`;
    }
    return `fn verify_basic_auth(username: &str, password: &str) -> Result<(), Box<dyn std::error::Error>> {
    // TODO: Basic auth 검증 로직
    Ok(())
}`;
  }

  /**
   * Data 처리 생성
   */
  private emitData(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { input_type, operation, filter, description } =
      decl.properties || {};

    const code = `
/// ${description || "Data operation"}
fn process_data(input: Vec<i32>) -> Vec<i32> {
    ${this.emitRustDataOperation(operation, filter)}
}

fn main() {
    let data = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let result = process_data(data);
    println!("Result: {:?}", result);
}
`.trim();

    return code;
  }

  /**
   * Rust 데이터 연산 생성
   */
  private emitRustDataOperation(operation: string, filter?: string): string {
    switch (operation) {
      case "filter":
        return `input.into_iter()
        .filter(|x| ${filter || "*x > 0"})
        .collect()`;
      case "map":
        return `input.into_iter()
        .map(|x| x * 2)
        .collect()`;
      case "reduce":
        return `vec![input.into_iter().sum()]`;
      default:
        return `input`;
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
use sqlx::postgres::PgPool;
use sqlx::Pool;

/// Database Configuration
/// ${description || "Database setup"}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://user:password@localhost/freelang_db".to_string());

    let pool = PgPool::connect(&database_url).await?;

    // TODO: Create ${table_count || 0} table(s)
    println!("Database initialized");

    Ok(())
}
`.trim();

    return code;
  }

  /**
   * 기본 생성
   */
  private emitDefault(spec: V4Spec): string {
    return `
use chrono::Utc;
use serde_json::json;

/// FreeLang v5 Generated Code
/// Type: ${spec.type}

fn main() {
    let generated = json!({
        "type": "${spec.type}",
        "timestamp": Utc::now().to_rfc3339()
    });
    println!("{}", generated);
}
`.trim();
  }

  /**
   * 반환값 생성
   */
  private getReturnValue(returnType?: string): string {
    if (!returnType || returnType === "void") {
      return "";
    }
    if (returnType === "int") {
      return "0";
    }
    if (returnType === "string") {
      return 'String::new()';
    }
    if (returnType === "bool") {
      return "false";
    }
    if (returnType?.includes("array")) {
      return "vec![]";
    }
    return "unimplemented!()";
  }

  /**
   * v4 타입을 Rust 타입으로 매핑
   */
  private mapType(type: string): string {
    const typeMap: Record<string, string> = {
      int: "i32",
      float: "f64",
      string: "String",
      bool: "bool",
      array: "Vec<T>",
      "array<int>": "Vec<i32>",
      "array<string>": "Vec<String>",
      "array<float>": "Vec<f64>",
      object: "serde_json::Value",
      void: "()",
      any: "Box<dyn std::any::Any>",
    };
    return typeMap[type] || "Box<dyn std::any::Any>";
  }
}
