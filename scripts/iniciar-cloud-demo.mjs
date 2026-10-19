import { spawn } from "node:child_process";
// .env.local lo carga Next; no se habilita APP_MODE=local ni se publica SQLite.
const env = { ...process.env, APP_MODE: "cloud-demo" };
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3000"], { env, stdio: "inherit" });
server.on("error", () => { console.error("No se pudo iniciar Next.js"); process.exitCode = 1; });
server.on("exit", code => { process.exitCode = code ?? 1; });
