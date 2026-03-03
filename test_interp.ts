import { FreeLangRuntime } from "./src/runtime/runtime";

const code = `fn add(a: number, b: number) -> number {
  return a + b;
}

fn fib(n: number) -> number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

fn main() -> void {
  var sum = add(10, 20);
  var f5 = fib(5);
  print("add(10, 20) =", sum);
  print("fib(5) =", f5);
}`;

console.log("🧪 인터프리터 테스트");
console.log("코드:", code.split('\n').slice(0, 3).join('\n'), "...\n");

const runtime = new FreeLangRuntime();
try {
  runtime.run(code);
  console.log("\n✅ 실행 성공!");
} catch (e) {
  console.error("\n❌ 실행 실패:", (e as Error).message);
}
