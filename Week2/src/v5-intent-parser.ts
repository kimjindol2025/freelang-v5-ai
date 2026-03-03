/**
 * FreeLang v5 Intent Parser
 * 자연어 → Intent AST → v4 형식 변환
 */

import Anthropic from "@anthropic-ai/sdk";

/**
 * Intent 인터페이스
 */
export interface Intent {
  action:
    | "create"
    | "modify"
    | "analyze"
    | "optimize"
    | "deploy"
    | "test";
  context:
    | "function"
    | "server"
    | "data"
    | "api"
    | "database"
    | "security";
  parameters: Record<string, any>;
  metadata?: {
    description?: string;
    author?: string;
    timestamp?: number;
  };
}

/**
 * v4 형식 (메타 명세)
 */
export interface V4Spec {
  type: string;
  name?: string;
  declarations: Declaration[];
  metadata?: Record<string, any>;
}

export interface Declaration {
  type: string;
  name?: string;
  value?: any;
  properties?: Record<string, any>;
}

/**
 * 검증 결과
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * V5 Intent Parser 클래스
 */
export class V5IntentParser {
  private client: Anthropic;
  private model: string = "claude-opus-4-6";

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * 1️⃣ 자연어 입력 → Intent AST
   */
  async parseIntent(userInput: string): Promise<Intent> {
    const prompt = `
당신은 FreeLang v5의 Intent Parser입니다.
사용자 입력을 분석하여 Intent AST로 변환하세요.

다음 Intent 카테고리를 지원합니다:
- action: "create", "modify", "analyze", "optimize", "deploy", "test"
- context: "function", "server", "data", "api", "database", "security"

사용자 입력: "${userInput}"

응답 형식 (JSON):
{
  "action": "create",
  "context": "function",
  "parameters": {
    "name": "...",
    "inputs": [...],
    "output": "...",
    "description": "..."
  }
}

JSON만 응답하세요 (마크다운 없음).
`;

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    try {
      // JSON 추출 (마크다운 코드블록 제거)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("JSON 파싱 실패");
      }

      const intent = JSON.parse(jsonMatch[0]);
      intent.metadata = intent.metadata || {};
      intent.metadata.timestamp = Date.now();

      return intent as Intent;
    } catch (error) {
      console.error("Intent 파싱 오류:", error);
      throw new Error(`Intent 파싱 실패: ${userInput}`);
    }
  }

  /**
   * 2️⃣ Intent → v4 형식 변환
   */
  generateV4Format(intent: Intent): V4Spec {
    const v4Spec: V4Spec = {
      type: intent.context,
      declarations: [],
      metadata: intent.metadata,
    };

    switch (intent.action) {
      case "create":
        return this.createV4Spec(intent);
      case "modify":
        return this.modifyV4Spec(intent);
      case "analyze":
        return this.analyzeV4Spec(intent);
      case "optimize":
        return this.optimizeV4Spec(intent);
      default:
        return v4Spec;
    }
  }

  /**
   * 3️⃣ v4 형식 검증
   */
  validateV4(spec: V4Spec): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 필수 필드 검사
    if (!spec.type) {
      errors.push("v4Spec.type이 필수입니다");
    }

    if (!spec.declarations || spec.declarations.length === 0) {
      warnings.push("declarations이 비어있습니다");
    }

    // 타입 검증
    const validTypes = [
      "function",
      "server",
      "data",
      "api",
      "database",
      "security",
    ];
    if (spec.type && !validTypes.includes(spec.type)) {
      errors.push(`유효하지 않은 타입: ${spec.type}`);
    }

    // declarations 검증
    if (spec.declarations) {
      spec.declarations.forEach((decl, index) => {
        if (!decl.type) {
          errors.push(`declarations[${index}].type이 필수입니다`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 4️⃣ Intent → v4 → 코드 생성 (초기 구현)
   */
  async generateCode(
    spec: V4Spec,
    language: "ts" | "c" | "py" | "go" | "rs"
  ): Promise<string> {
    const prompt = `
FreeLang v4 형식을 ${this.getLanguageName(language)} 코드로 변환하세요.

v4 Spec:
${JSON.stringify(spec, null, 2)}

${this.getLanguageGuide(language)}

생성된 코드를 반환하세요.
`;

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return message.content[0].type === "text" ? message.content[0].text : "";
  }

  /**
   * 헬퍼: v4 Spec 생성 (Create)
   */
  private createV4Spec(intent: Intent): V4Spec {
    const { context, parameters } = intent;

    if (context === "function") {
      return {
        type: "function",
        name: parameters.name,
        declarations: [
          {
            type: "function_declaration",
            name: parameters.name,
            properties: {
              inputs: parameters.inputs || [],
              output: parameters.output || "void",
              description: parameters.description || "",
            },
          },
        ],
      };
    }

    if (context === "server") {
      return {
        type: "server",
        declarations: [
          {
            type: "server_declaration",
            properties: {
              port: parameters.port || 8080,
              type: parameters.type || "rest_api",
              framework: parameters.framework || "express",
              endpoints: parameters.endpoints || [],
            },
          },
        ],
      };
    }

    // 기본 반환
    return {
      type: context,
      declarations: [
        {
          type: `${context}_declaration`,
          properties: parameters,
        },
      ],
    };
  }

  /**
   * 헬퍼: v4 Spec 수정 (Modify)
   */
  private modifyV4Spec(intent: Intent): V4Spec {
    return {
      type: intent.context,
      declarations: [
        {
          type: `${intent.context}_modification`,
          properties: intent.parameters,
        },
      ],
    };
  }

  /**
   * 헬퍼: v4 Spec 분석 (Analyze)
   */
  private analyzeV4Spec(intent: Intent): V4Spec {
    return {
      type: intent.context,
      declarations: [
        {
          type: `${intent.context}_analysis`,
          properties: intent.parameters,
        },
      ],
    };
  }

  /**
   * 헬퍼: v4 Spec 최적화 (Optimize)
   */
  private optimizeV4Spec(intent: Intent): V4Spec {
    return {
      type: intent.context,
      declarations: [
        {
          type: `${intent.context}_optimization`,
          properties: intent.parameters,
        },
      ],
    };
  }

  /**
   * 헬퍼: 언어명
   */
  private getLanguageName(lang: string): string {
    const names: Record<string, string> = {
      ts: "TypeScript (Express)",
      c: "C (libuv)",
      py: "Python (FastAPI)",
      go: "Go (net/http)",
      rs: "Rust (Actix)",
    };
    return names[lang] || lang;
  }

  /**
   * 헬퍼: 언어별 가이드
   */
  private getLanguageGuide(lang: string): string {
    const guides: Record<string, string> = {
      ts: "TypeScript + Express.js를 사용하세요. ESM 형식.",
      c: "C + libuv를 사용하세요. POSIX 호환.",
      py: "Python + FastAPI를 사용하세요. async/await.",
      go: "Go + net/http를 사용하세요. 고루틴.",
      rs: "Rust + Actix-web를 사용하세요. async tokio.",
    };
    return guides[lang] || "";
  }
}

/**
 * 사용 예시
 */
export async function example() {
  const parser = new V5IntentParser();

  try {
    // 1. Intent 파싱
    console.log("🔍 Intent 파싱 중...");
    const intent = await parser.parseIntent(
      "8080 포트에서 사용자 조회하는 REST API 만들어"
    );
    console.log("✅ Intent:", JSON.stringify(intent, null, 2));

    // 2. v4 형식 변환
    console.log("\n📝 v4 형식 변환 중...");
    const v4Spec = parser.generateV4Format(intent);
    console.log("✅ v4Spec:", JSON.stringify(v4Spec, null, 2));

    // 3. 검증
    console.log("\n✔️ v4 검증 중...");
    const validation = parser.validateV4(v4Spec);
    console.log(
      "✅ 검증 결과:",
      validation.valid ? "통과" : "실패",
      validation.errors
    );

    // 4. 코드 생성
    console.log("\n⚙️ TypeScript 코드 생성 중...");
    const tsCode = await parser.generateCode(v4Spec, "ts");
    console.log("✅ TypeScript:\n", tsCode);
  } catch (error) {
    console.error("❌ 오류:", error);
  }
}

// CLI 실행
if (require.main === module) {
  example();
}
