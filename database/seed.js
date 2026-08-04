import "dotenv/config";
import { fileURLToPath } from "url";
import { bootstrapDatabase, getBootstrapStatus } from "./bootstrap.js";
import { hasKaggleCsv } from "./ingest_kaggle.js";

/**
 * One-shot loader: `npm run seed` (from the repo root or from ./database).
 *
 * Loads the EA FC CSV dumps when they are present in this folder, otherwise
 * falls back to the small JSON fixtures, then seeds formations, the demo
 * accounts and the demo match data. The API performs the exact same load
 * automatically on start-up when the database is empty, so running this by
 * hand is only needed to force a rebuild.
 */
export { bootstrapDatabase as seedDatabase };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async function runStandalone() {
    const { connectDB, disconnectDB } = await import("../server/src/config/db.js");
    console.log(
      hasKaggleCsv()
        ? "[seed] Kaggle CSVs detected - loading the full EA FC dataset."
        : "[seed] No Kaggle CSVs found - loading the JSON fixtures."
    );

    await connectDB({ autoBootstrap: false });
    try {
      await bootstrapDatabase({ force: true });
      const { counts } = getBootstrapStatus();
      console.log(
        `[seed] done: ${counts.players} players, ${counts.teams} teams, ${counts.leagues} leagues.`
      );
      console.log("[seed] demo logins: coach@taqtiq.com / admin@taqtiq.com (password123)");
    } catch (err) {
      console.error("[seed] failed:", err);
      process.exitCode = 1;
    } finally {
      await disconnectDB();
    }
  })();
}
