import { V5Parser } from "./src/runtime/v5-parser";

const code = `fn add(a: number, b: number) -> number {
  return a + b;
}`;

console.log("🧪 테스트 코드:");
console.log(code);
console.log("\n🔍 파싱 시작...");

const parser = new V5Parser();
try {
  const spec = parser.parse(code);
  console.log("✅ 파싱 성공!");
  console.log(JSON.stringify(spec, null, 2));
} catch (e) {
  console.error("❌ 파싱 실패:", (e as Error).message);
  console.error("스택:", (e as Error).stack);
}
