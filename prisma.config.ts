import { defineConfig, env } from "prisma/config";
import { loadEnvFiles } from "./lib/env/load-env";

loadEnvFiles();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
