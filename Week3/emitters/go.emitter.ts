/**
 * Go Emitter
 * v4 형식 → Go + net/http 코드 생성
 */

import { V4Spec, Declaration } from "../../Week2/src/v5-intent-parser";
import { BaseEmitter } from "./emitter.interface";

export class GoEmitter extends BaseEmitter {
  /**
   * v4 명세를 Go + net/http 코드로 변환
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
      .map((type: string, i: number) => `arg${i} ${this.mapType(type)}`)
      .join(", ");

    const code = `
package main

import (
  "fmt"
)

// ${description || "Generated function"}
func ${function_name || "Generated"}(${params}) ${this.mapType(return_type || "void")} {
  // TODO: 함수 로직 구현
  ${return_type && return_type !== "void" ? "return nil" : ""}
}

func main() {
  fmt.Println("Generated Go function")
}
`.trim();

    return code;
  }

  /**
   * Server 생성 (net/http)
   */
  private emitServer(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { port, server_type, framework } = decl.properties || {};

    const endpoints = spec.declarations.slice(1).map((ep) => this.emitEndpoint(ep));

    const code = `
package main

import (
  "fmt"
  "net/http"
  "encoding/json"
  "log"
  "os"
)

const PORT = ":${port || 8080}"

${endpoints.join("\n\n")}

func healthHandler(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(map[string]interface{}{
    "status":    "ok",
    "timestamp": time.Now().UTC().String(),
  })
}

func main() {
  mux := http.NewServeMux()
  mux.HandleFunc("/health", healthHandler)
  ${endpoints.map(() => "// mux.HandleFunc(..., ...Handler)").join("\n  ")}

  log.Printf("Server listening on port %s\\n", PORT)
  if err := http.ListenAndServe(PORT, mux); err != nil {
    log.Fatal(err)
  }
}
`.trim();

    return code;
  }

  /**
   * Endpoint 생성
   */
  private emitEndpoint(decl: Declaration): string {
    const { method, path, description, handler } = decl.properties || {};

    return `// ${description || "Endpoint handler"}
func ${handler || `Handle${method}`}(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(map[string]interface{}{
    "message": "Success",
    "method":  "${method}",
    "path":    "${path}",
  })
}`;
  }

  /**
   * API 정의 생성
   */
  private emitAPI(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { version, base_path, auth_type } = decl.properties || {};

    const code = `
package main

import (
  "fmt"
  "net/http"
  "encoding/json"
  "log"
)

const (
  APIVersion = "${version || "1.0"}"
  BasePath   = "${base_path || "/api"}"
  ${auth_type && auth_type !== "none" ? `AuthType   = "${auth_type}"` : ""}
)

${auth_type && auth_type !== "none" ? this.emitGoAuthMiddleware(auth_type) : ""}

func healthHandler(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(map[string]interface{}{
    "status":  "healthy",
    "version": APIVersion,
  })
}

func main() {
  mux := http.NewServeMux()
  mux.HandleFunc(BasePath+"/health", healthHandler)

  log.Printf("API Server v%s starting...\\n", APIVersion)
  if err := http.ListenAndServe(":8080", mux); err != nil {
    log.Fatal(err)
  }
}
`.trim();

    return code;
  }

  /**
   * Go 인증 미들웨어 생성
   */
  private emitGoAuthMiddleware(authType: string): string {
    if (authType === "jwt") {
      return `func verifyToken(token string) error {
  // TODO: JWT 검증 로직
  return nil
}`;
    }
    if (authType === "oauth2") {
      return `func verifyOAuth2(token string) error {
  // TODO: OAuth2 검증 로직
  return nil
}`;
    }
    return `func verifyBasicAuth(username, password string) error {
  // TODO: Basic auth 검증 로직
  return nil
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
package main

import (
  "fmt"
)

// ${description || "Data operation"}
func processData(input []int) []int {
  ${this.emitGoDataOperation(operation, filter)}
}

func main() {
  data := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
  result := processData(data)
  fmt.Println("Result:", result)
}
`.trim();

    return code;
  }

  /**
   * Go 데이터 연산 생성
   */
  private emitGoDataOperation(operation: string, filter?: string): string {
    switch (operation) {
      case "filter":
        return `var result []int
  for _, x := range input {
    if ${filter || "x > 0"} {
      result = append(result, x)
    }
  }
  return result`;
      case "map":
        return `result := make([]int, len(input))
  for i, x := range input {
    result[i] = x * 2
  }
  return result`;
      case "reduce":
        return `sum := 0
  for _, x := range input {
    sum += x
  }
  return []int{sum}`;
      default:
        return `return input`;
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
package main

import (
  "database/sql"
  _ "github.com/lib/pq"
  "log"
)

// Database Configuration
// ${description || "Database setup"}

func initDatabase() error {
  connStr := "user=postgres password=postgres dbname=freelang_db sslmode=disable"
  db, err := sql.Open("postgres", connStr)
  if err != nil {
    return err
  }
  defer db.Close()

  log.Println("Database initialized")
  // TODO: Create ${table_count || 0} table(s)
  return nil
}

func main() {
  if err := initDatabase(); err != nil {
    log.Fatal(err)
  }
}
`.trim();

    return code;
  }

  /**
   * 기본 생성
   */
  private emitDefault(spec: V4Spec): string {
    return `
package main

import (
  "fmt"
  "time"
)

// FreeLang v5 Generated Code
// Type: ${spec.type}

func main() {
  generated := map[string]interface{}{
    "type":      "${spec.type}",
    "timestamp": time.Now().UTC().String(),
  }
  fmt.Println(generated)
}
`.trim();
  }

  /**
   * v4 타입을 Go 타입으로 매핑
   */
  private mapType(type: string): string {
    const typeMap: Record<string, string> = {
      int: "int",
      float: "float64",
      string: "string",
      bool: "bool",
      array: "[]interface{}",
      "array<int>": "[]int",
      "array<string>": "[]string",
      "array<float>": "[]float64",
      object: "map[string]interface{}",
      void: "",
      any: "interface{}",
    };
    return typeMap[type] || "interface{}";
  }
}
