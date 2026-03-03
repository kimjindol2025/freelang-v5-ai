/**
 * FreeLang v5 Emitters Index
 * 모든 언어 Emitter 내보내기
 */

export { ICodeEmitter, BaseEmitter } from "./emitter.interface";
export { TypeScriptEmitter } from "./typescript.emitter";
export { CEmitter } from "./c.emitter";
export { PythonEmitter } from "./python.emitter";
export { GoEmitter } from "./go.emitter";
export { RustEmitter } from "./rust.emitter";

import { ICodeEmitter } from "./emitter.interface";
import { TypeScriptEmitter } from "./typescript.emitter";
import { CEmitter } from "./c.emitter";
import { PythonEmitter } from "./python.emitter";
import { GoEmitter } from "./go.emitter";
import { RustEmitter } from "./rust.emitter";

/**
 * Emitter 팩토리
 */
export class EmitterFactory {
  static create(language: "ts" | "c" | "py" | "go" | "rs"): ICodeEmitter {
    switch (language) {
      case "ts":
        return new TypeScriptEmitter();
      case "c":
        return new CEmitter();
      case "py":
        return new PythonEmitter();
      case "go":
        return new GoEmitter();
      case "rs":
        return new RustEmitter();
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  static supportedLanguages(): string[] {
    return ["ts", "c", "py", "go", "rs"];
  }
}
