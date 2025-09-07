#!/usr/bin/env node
const { spawn } = require("child_process");
const target = (process.argv[2] || "all").toLowerCase();
const run = (cmd, args) => new Promise((res, rej) => {
  const p = spawn(cmd, args, { stdio: "inherit", shell: true });
  p.on("close", c => c === 0 ? res() : rej(new Error(`${cmd} ${args.join(" ")} -> ${c}`)));
});
(async () => {
  if (target === "chrome" || target === "all") await run("npm", ["run", "pack"]);
  if (target === "firefox" || target === "all") await run("npm", ["run", "pack-ff"]);
  console.log("✅ Repack finished.");
})().catch(e => { console.error("❌ Repack failed:", e.message); process.exit(1); });
