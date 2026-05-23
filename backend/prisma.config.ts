import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "src/db/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://johndoe:randompassword@localhost:5432/mydb",
  },
});
