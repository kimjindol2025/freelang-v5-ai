import { V5Parser } from "./src/runtime/v5-parser";

const parser = new V5Parser();
const spec = parser.parse(`
fn add(a: number, b: number) -> number {
  return a + b;
}
`);

console.log("파싱 결과:");
console.log(JSON.stringify(spec, null, 2));
