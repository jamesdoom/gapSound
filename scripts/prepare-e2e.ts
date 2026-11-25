import { spawn } from "node:child_process";
await import("./seed-e2e");
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    process.env.GAPSOUND_PORT || "3100",
  ],
  { stdio: "inherit", env: process.env, windowsHide: true },
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
