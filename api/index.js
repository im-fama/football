import app from "../server/src/app.js";
import { connectDB } from "../server/src/config/db.js";

/**
 * Vercel serverless entry point.
 *
 * Auto-loading is disabled here on purpose: the CSV dumps are gitignored (too
 * large to deploy), lambdas are ephemeral, and several could race each other
 * into a half-written collection. Seed the Atlas cluster once from a machine
 * that has the CSVs:
 *
 *   MONGO_URI="mongodb+srv://..." npm run seed
 */
export default async function handler(req, res) {
  await connectDB({ autoBootstrap: false });
  return app(req, res);
}
