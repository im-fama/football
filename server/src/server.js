import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

async function start() {
  // Resolves once Mongo is up. If the database is empty the dataset load is
  // kicked off in the background, so the API starts listening immediately and
  // the client can show progress via GET /api/admin/status.
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[server] taqtiq API listening on :${PORT}`);
  });
}

start().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
