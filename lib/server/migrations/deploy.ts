import { spawn } from "node:child_process";
import path from "node:path";

function resolvePrismaCliPath(): string {
  return path.join(process.cwd(), "node_modules", ".bin", "prisma");
}

export async function deployPendingMigrations(): Promise<void> {
  const prismaCli = resolvePrismaCliPath();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(prismaCli, ["migrate", "deploy"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          stderr.trim() ||
            `prisma migrate deploy failed with exit code ${code ?? "unknown"}.`
        )
      );
    });
  });
}
