import fs from "node:fs";
import path from "node:path";

const distIndexPath = path.resolve("dist", "public", "index.html");

if (!fs.existsSync(distIndexPath)) {
  process.exit(0);
}

const html = fs.readFileSync(distIndexPath, "utf8");

const cleaned = html
  .replace(/\s*<script src="\/__manus__\/debug-collector\.js" defer><\/script>\s*/g, "\n")
  .replace(/\s*<script id="manus-runtime">[\s\S]*?<\/script>\s*/g, "\n");

if (cleaned !== html) {
  fs.writeFileSync(distIndexPath, cleaned, "utf8");
}
