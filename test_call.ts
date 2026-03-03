import { FreeLangRuntime } from "./src/runtime/runtime";

const rt = new FreeLangRuntime();
rt.run(`
fn add(a: number, b: number) -> number {
  return a + b;
}
`);

console.log("\n🔍 add(5, 3) = " + rt.call("add", 5, 3));
