import { FreeLangRuntime } from "./src/runtime/runtime";

const code = `fn test(n: number) -> number {
  if (n <= 1) return 10;
  return 20;
}

fn main() -> void {
  var r1 = test(0);
  var r2 = test(5);
  print("test(0) =", r1);
  print("test(5) =", r2);
}`;

console.log("테스트: if 문\n");
const runtime = new FreeLangRuntime();
try {
  runtime.run(code);
} catch (e) {
  console.error("❌ 에러:", (e as Error).message);
}
