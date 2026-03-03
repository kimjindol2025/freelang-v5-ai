#!/usr/bin/env node

/**
 * FreeLang v5 CLI
 * AI-First Intent-Based Programming Language
 *
 * Usage:
 *   freelang "REST API 만들어"
 *   freelang generate "DATABASE 설정"
 *   freelang optimize ./generated.ts
 *   freelang validate ./code.ts
 */

import * as fs from "fs";
import * as path from "path";
import { generateCommand } from "./commands/generate";
import { optimizeCommand } from "./commands/optimize";
import { validateCommand } from "./commands/validate";
import { runCommand } from "./commands/run";

const VERSION = "5.0.0-alpha";

interface CLIArgs {
  command: string;
  args: string[];
}

/**
 * CLI 진입점
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];

  try {
    switch (command) {
      case "--version":
      case "-v":
        console.log(`FreeLang v5 CLI v${VERSION}`);
        break;

      case "--help":
      case "-h":
        showHelp();
        break;

      case "generate":
        await generateCommand(args.slice(1));
        break;

      case "optimize":
        await optimizeCommand(args.slice(1));
        break;

      case "validate":
        await validateCommand(args.slice(1));
        break;

      case "run":
        await runCommand(args.slice(1));
        break;

      // Direct intent (no explicit 'generate' command)
      default:
        // Treat as intent if it starts with a quote or doesn't match a command
        if (!command.startsWith("-")) {
          const intent = args.join(" ");
          console.log(`\n🚀 FreeLang v5 AI-First Code Generator\n`);
          console.log(`📝 Intent: "${intent}"\n`);
          await generateCommand([intent]);
        } else {
          console.error(`❌ Unknown command: ${command}`);
          console.log(`Use 'freelang --help' for usage information.`);
          process.exit(1);
        }
    }
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * 도움말 표시
 */
function showHelp(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          🚀 FreeLang v5 AI-First Language CLI                  ║
║                  Human 10% + AI 90%                            ║
╚════════════════════════════════════════════════════════════════╝

📖 USAGE:

  Direct Intent (most common):
    freelang "REST API 8080 포트에서 만들어"
    freelang "데이터베이스 스키마 정의해"
    freelang "사용자 인증 시스템 구축해"

  Explicit Commands:
    freelang generate "당신의 의도"      (코드 생성)
    freelang run "당신의 의도"           (코드 생성 후 바로 실행)
    freelang optimize <파일경로>        (최적화)
    freelang validate <파일경로>        (보안 검증)

  Information:
    freelang --version
    freelang --help

📋 EXAMPLES:

  1️⃣ Generate REST API:
     freelang "Express.js REST API 포트 3000에서 사용자 관리"

  2️⃣ Optimize Generated Code:
     freelang optimize ./generated.ts

  3️⃣ Validate Security:
     freelang validate ./generated.ts

🎯 FEATURES:

  ✅ Intent-Based Code Generation
     - Natural language → Code (5 languages)
     - TypeScript, C, Python, Go, Rust

  ✅ Automatic Code Generation
     - Intent parsing (Claude API)
     - v4 specification format
     - Language-specific emitters

  ✅ Built-in Optimization
     - Dead-code removal
     - Constant folding
     - Type inference
     - Duplicate elimination

  ✅ Security Validation
     - SQL Injection detection
     - XSS vulnerability check
     - Hardcoded credentials
     - Dangerous functions

  ✅ Performance Analysis
     - O(n²) pattern detection
     - N+1 query identification
     - Caching opportunities
     - Algorithmic complexity

📦 OUTPUT:

  Generated code saves to: ./freelang-generated/

  Structure:
    freelang-generated/
    ├── intent.json           (parsed intent)
    ├── v4-spec.json          (v4 specification)
    ├── main.ts               (TypeScript)
    ├── main.c                (C)
    ├── main.py               (Python)
    ├── main.go               (Go)
    ├── main.rs               (Rust)
    ├── analysis.json         (optimization + security + performance)
    └── report.html           (visual report)

🔗 Documentation:
   https://gogs.dclub.kr/kim/freelang-v5-ai

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Version: ${VERSION} | FreeLang v5.0.0-alpha | 2026-03-03
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

// CLI 실행
if (require.main === module) {
  main().catch(console.error);
}

export { main };
