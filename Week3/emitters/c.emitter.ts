/**
 * C Emitter
 * v4 형식 → C + libuv 코드 생성
 */

import { V4Spec, Declaration } from "../../Week2/src/v5-intent-parser";
import { BaseEmitter } from "./emitter.interface";

export class CEmitter extends BaseEmitter {
  /**
   * v4 명세를 C + libuv 코드로 변환
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
      .map((type: string, i: number) => `${this.mapType(type)} arg${i}`)
      .join(", ");

    const code = `
#include <stdio.h>
#include <stdlib.h>

/*
 * ${description || "Generated function"}
 */
${this.mapType(return_type || "void")} ${function_name || "generated"}(${params || "void"}) {
  // TODO: 함수 로직 구현
  ${return_type && return_type !== "void" ? "return 0;" : ""}
}

int main(void) {
  printf("Generated C function\\n");
  return 0;
}
`.trim();

    return code;
  }

  /**
   * Server 생성 (libuv 기반)
   */
  private emitServer(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { port, server_type, framework } = decl.properties || {};

    const code = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <uv.h>

#define PORT ${port || 8080}

typedef struct {
  uv_write_t req;
  uv_buf_t buf;
} write_req_t;

static void alloc_buffer(uv_handle_t *handle, size_t suggested_size, uv_buf_t *buf) {
  buf->base = malloc(suggested_size);
  buf->len = suggested_size;
}

static void on_close(uv_handle_t *handle) {
  free(handle);
}

static void on_write(uv_write_t *req, int status) {
  write_req_t *wr = (write_req_t *)req;
  if (status < 0) {
    fprintf(stderr, "Write error: %s\\n", uv_strerror(status));
  }
  free(wr->buf.base);
  free(wr);
}

static void on_read(uv_stream_t *client, ssize_t nread, const uv_buf_t *buf) {
  if (nread < 0) {
    uv_close((uv_handle_t *)client, on_close);
    return;
  }

  write_req_t *req = malloc(sizeof(write_req_t));
  const char *response = "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n{\\"status\\":\\"ok\\"}\\r\\n";
  req->buf = uv_buf_init((char *)response, strlen(response));

  uv_write(&req->req, client, &req->buf, 1, on_write);
  free(buf->base);
}

static void on_connection(uv_stream_t *server, int status) {
  if (status < 0) {
    fprintf(stderr, "Connection error: %s\\n", uv_strerror(status));
    return;
  }

  uv_tcp_t *client = malloc(sizeof(uv_tcp_t));
  uv_tcp_init(uv_default_loop(), client);

  if (uv_accept(server, (uv_stream_t *)client) == 0) {
    uv_read_start((uv_stream_t *)client, alloc_buffer, on_read);
  } else {
    uv_close((uv_handle_t *)client, on_close);
  }
}

int main(void) {
  uv_loop_t *loop = uv_default_loop();
  uv_tcp_t server;
  struct sockaddr_in bind_addr;

  uv_tcp_init(loop, &server);
  bind_addr = uv_ip4_addr("0.0.0.0", PORT, &bind_addr);

  if (uv_tcp_bind(&server, (const struct sockaddr *)&bind_addr, 0) < 0) {
    fprintf(stderr, "Bind failed\\n");
    return 1;
  }

  if (uv_listen((uv_stream_t *)&server, 128, on_connection) < 0) {
    fprintf(stderr, "Listen failed\\n");
    return 1;
  }

  printf("Server listening on port %d\\n", PORT);
  uv_run(loop, UV_RUN_DEFAULT);

  uv_loop_close(loop);
  return 0;
}
`.trim();

    return code;
  }

  /**
   * API 정의 생성
   */
  private emitAPI(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { version, base_path, auth_type } = decl.properties || {};

    const code = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <uv.h>

#define API_VERSION "${version || "1.0"}"
#define BASE_PATH "${base_path || "/api"}"
#define PORT 8080

${auth_type && auth_type !== "none" ? `#define AUTH_TYPE "${auth_type}"` : ""}

int main(void) {
  uv_loop_t *loop = uv_default_loop();

  printf("API Server v%s starting...\\n", API_VERSION);
  printf("Base path: %s\\n", BASE_PATH);
  ${auth_type && auth_type !== "none" ? `printf("Auth: %s\\n", AUTH_TYPE);` : ""}

  // TODO: 서버 초기화

  uv_run(loop, UV_RUN_DEFAULT);
  return 0;
}
`.trim();

    return code;
  }

  /**
   * Data 처리 생성
   */
  private emitData(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { input_type, operation, filter, description } =
      decl.properties || {};

    const code = `
#include <stdio.h>
#include <stdlib.h>

/*
 * ${description || "Data operation"}
 */
void process_data(int *input, int len) {
  printf("Processing %d elements\\n", len);

  ${this.emitCDataOperation(operation, filter)}
}

int main(void) {
  int data[] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
  process_data(data, 10);
  return 0;
}
`.trim();

    return code;
  }

  /**
   * C 데이터 연산 생성
   */
  private emitCDataOperation(operation: string, filter?: string): string {
    switch (operation) {
      case "filter":
        return `for (int i = 0; i < len; i++) {
    if (${filter || "input[i] > 0"}) {
      printf("%d ", input[i]);
    }
  }
  printf("\\n");`;
      case "map":
        return `for (int i = 0; i < len; i++) {
    input[i] = input[i] * 2;
  }`;
      case "reduce":
        return `int sum = 0;
  for (int i = 0; i < len; i++) {
    sum += input[i];
  }
  printf("Sum: %d\\n", sum);`;
      default:
        return `for (int i = 0; i < len; i++) {
    printf("%d ", input[i]);
  }
  printf("\\n");`;
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
#include <stdio.h>
#include <stdlib.h>
#include <sqlite3.h>

/*
 * Database Configuration
 * ${description || "Database setup"}
 */

int main(void) {
  sqlite3 *db;
  char *err = 0;
  int rc;

  rc = sqlite3_open("freelang.db", &db);
  if (rc) {
    fprintf(stderr, "Cannot open database: %s\\n", sqlite3_errmsg(db));
    return 1;
  }

  printf("Database initialized\\n");
  // TODO: Create ${table_count || 0} table(s)

  sqlite3_close(db);
  return 0;
}
`.trim();

    return code;
  }

  /**
   * 기본 생성
   */
  private emitDefault(spec: V4Spec): string {
    return `
#include <stdio.h>
#include <time.h>

/*
 * FreeLang v5 Generated Code
 * Type: ${spec.type}
 */

int main(void) {
  time_t now = time(NULL);
  printf("Generated C program at %ld\\n", now);
  return 0;
}
`.trim();
  }

  /**
   * v4 타입을 C 타입으로 매핑
   */
  private mapType(type: string): string {
    const typeMap: Record<string, string> = {
      int: "int",
      float: "float",
      string: "char*",
      bool: "int",
      array: "int*",
      "array<int>": "int*",
      "array<string>": "char**",
      "array<float>": "float*",
      object: "struct",
      void: "void",
      any: "void*",
    };
    return typeMap[type] || "void*";
  }
}
