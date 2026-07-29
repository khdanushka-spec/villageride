import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.join(__dirname, "..", ".pgdata");

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: 54329,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

async function main() {
  try {
    await pg.initialise();
    console.log("[dev-db] initialised data directory");
  } catch (err) {
    console.log("[dev-db] already initialised, skipping init:", err.message);
  }

  await pg.start();
  console.log("[dev-db] postgres started on port 54329");

  try {
    await pg.createDatabase("villageride");
    console.log("[dev-db] created database villageride");
  } catch (err) {
    console.log("[dev-db] database villageride already exists");
  }

  console.log("[dev-db] READY postgres://postgres:postgres@localhost:54329/villageride");
}

main().catch((err) => {
  console.error("[dev-db] fatal error", err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await pg.stop();
  process.exit(0);
});
