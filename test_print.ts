import { FreeLangRuntime } from "./src/runtime/runtime";

const rt = new FreeLangRuntime();
rt.run("fn main() -> void { print(\"Hello!\"); }");
