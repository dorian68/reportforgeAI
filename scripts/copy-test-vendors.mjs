import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve("assets/pptxgen.browser.js");
const destination = resolve(".test-dist/assets/pptxgen.browser.js");

if (!existsSync(source)) {
  process.exit(0);
}

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
