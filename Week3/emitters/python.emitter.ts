/**
 * Python Emitter
 * v4 형식 → Python + FastAPI 코드 생성
 */

import { V4Spec, Declaration } from "../../Week2/src/v5-intent-parser";
import { BaseEmitter } from "./emitter.interface";

export class PythonEmitter extends BaseEmitter {
  /**
   * v4 명세를 Python + FastAPI 코드로 변환
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
"""
${description || "Generated function"}
"""
def ${function_name || "generated"}(${params}) -> ${this.mapType(return_type || "None")}:
    """
    ${description || "Function implementation"}
    """
    # TODO: 함수 로직 구현
    pass


if __name__ == "__main__":
    print("Generated Python function")
`.trim();

    return code;
  }

  /**
   * Server 생성 (FastAPI)
   */
  private emitServer(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { port, server_type, framework, endpoint_count } =
      decl.properties || {};

    const endpoints = spec.declarations.slice(1).map((ep) => this.emitEndpoint(ep));

    const code = `
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime

app = FastAPI(title="FreeLang Generated API", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

${endpoints.join("\n\n")}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=${port || 8000})
`.trim();

    return code;
  }

  /**
   * Endpoint 생성
   */
  private emitEndpoint(decl: Declaration): string {
    const { method, path, description, handler } = decl.properties || {};

    const methodLower = (method || "GET").toLowerCase();
    const decorator = `@app.${methodLower}("${path || "/"}")`;

    const asyncPrefix = methodLower !== "get" ? "async " : "async ";

    return `${decorator}
${asyncPrefix}def ${handler || `handle_${methodLower}`}(request: Request):
    """${description || "Endpoint handler"}"""
    return {"message": "Success", "method": "${method}", "path": "${path}"}`;
  }

  /**
   * API 정의 생성
   */
  private emitAPI(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { version, base_path, auth_type, endpoint_count } =
      decl.properties || {};

    const code = `
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthCredentials
import uvicorn
from datetime import datetime
from typing import Optional

app = FastAPI(
    title="FreeLang API",
    version="${version || "1.0"}",
    docs_url="\${base_path || "/api"}/docs"
)

${auth_type && auth_type !== "none" ? this.emitAuthLogic(auth_type) : ""}

@app.get("\${base_path || "/api"}/health")
async def health():
    """API health check"""
    return {
        "status": "healthy",
        "version": "${version || "1.0"}",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=${process.env.PORT || 8000})
`.trim();

    return code;
  }

  /**
   * 인증 로직 생성
   */
  private emitAuthLogic(authType: string): string {
    if (authType === "jwt") {
      return `from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthCredentials = Depends(security)):
    """Verify JWT token"""
    token = credentials.credentials
    # TODO: JWT 검증 로직
    return token`;
    }
    if (authType === "oauth2") {
      return `from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def verify_oauth(token: str = Depends(oauth2_scheme)):
    """Verify OAuth2 token"""
    # TODO: OAuth2 검증 로직
    return token`;
    }
    return `from fastapi.security import HTTPBasic

security = HTTPBasic()

async def verify_basic(credentials: HTTPAuthCredentials = Depends(HTTPBasic())):
    """Verify basic auth"""
    return credentials`;
  }

  /**
   * Data 처리 생성
   */
  private emitData(spec: V4Spec): string {
    const decl = spec.declarations[0];
    const { input_type, operation, filter, description } =
      decl.properties || {};

    const code = `
from typing import List, Any

def process_data(input_data: ${this.mapType(input_type || "List")}) -> Any:
    """
    ${description || "Data operation"}
    """
    ${this.emitPythonDataOperation(operation, filter)}


if __name__ == "__main__":
    data = list(range(1, 11))
    result = process_data(data)
    print(f"Result: {result}")
`.trim();

    return code;
  }

  /**
   * Python 데이터 연산 생성
   */
  private emitPythonDataOperation(operation: string, filter?: string): string {
    switch (operation) {
      case "filter":
        return `return [x for x in input_data if ${filter || "x > 0"}]`;
      case "map":
        return `return [x * 2 for x in input_data]`;
      case "reduce":
        return `return sum(input_data)`;
      default:
        return `return input_data`;
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
"""
Database Configuration
${description || "Database setup"}
"""

from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./freelang.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_database():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized with {${table_count} || 0} table(s)")


if __name__ == "__main__":
    init_database()
`.trim();

    return code;
  }

  /**
   * 기본 생성
   */
  private emitDefault(spec: V4Spec): string {
    return `
"""
FreeLang v5 Generated Code
Type: ${spec.type}
"""

from datetime import datetime

def main():
    generated = {
        "type": "${spec.type}",
        "timestamp": datetime.utcnow().isoformat()
    }
    print(generated)


if __name__ == "__main__":
    main()
`.trim();
  }

  /**
   * v4 타입을 Python 타입으로 매핑
   */
  private mapType(type: string): string {
    const typeMap: Record<string, string> = {
      int: "int",
      float: "float",
      string: "str",
      bool: "bool",
      array: "List",
      "array<int>": "List[int]",
      "array<string>": "List[str]",
      "array<float>": "List[float]",
      object: "Dict[str, Any]",
      void: "None",
      any: "Any",
    };
    return typeMap[type] || "Any";
  }
}
