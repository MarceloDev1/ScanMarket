import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Direct (non-pooled) Supabase connection, used by the Prisma CLI for migrations.
    url: env("DIRECT_URL"),
  },
});
