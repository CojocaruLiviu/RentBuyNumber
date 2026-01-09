import { defineConfig } from "prisma/config";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve DATABASE_URL to absolute path
// If it's relative, resolve it relative to the project root (parent of prisma/)
const projectRoot = path.resolve(__dirname, "..");
const dbUrl = process.env.DATABASE_URL || "file:./dateev.db";
const dbPath = dbUrl.replace(/^file:/, "").replace(/^\/+/, "");
const absoluteDbPath = path.isAbsolute(dbPath) 
    ? path.normalize(dbPath) 
    : path.resolve(projectRoot, dbPath);

export default defineConfig({
  schema: "./schema.prisma",

  datasource: {
    url: `file:${absoluteDbPath}`,
  },

  migrations: {
    path: "./migrations",
  },
});
