import net from "net";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "./mongoose.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

function isPortOpen(host, port, timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

let memoryServer = null;
let connecting = null;

/**
 * Connects to MongoDB and, unless told otherwise, kicks off the dataset load
 * when the database comes up empty.
 *
 * Resolution order:
 *   1. MONGO_URI (Atlas / a real local server)
 *   2. a local mongod on 27017
 *   3. an embedded mongod, backed by ./.mongo-data so the ~20k ingested
 *      players survive a restart instead of re-parsing 96 MB of CSV every time
 */
export async function connectDB({ autoBootstrap = true } = {}) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connecting) return connecting;

  connecting = (async () => {
    const explicitUri = process.env.MONGO_URI;
    let uri = explicitUri;

    if (!uri) {
      const localUp = await isPortOpen("127.0.0.1", 27017);
      if (localUp) uri = "mongodb://127.0.0.1:27017/taqtiq";
    } else if (/127\.0\.0\.1|localhost/.test(uri)) {
      // A localhost URI is only usable if something is actually listening.
      const localUp = await isPortOpen("127.0.0.1", 27017);
      if (!localUp) {
        console.log("[db] MONGO_URI points at localhost but nothing is listening on 27017.");
        uri = null;
      }
    }

    if (uri) {
      try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
        console.log(`[db] connected -> ${mongoose.connection.name}`);
      } catch (err) {
        console.error(`[db] connection error: ${err.message}`);
        uri = null;
      }
    }

    if (!uri) {
      console.log("[db] starting embedded MongoDB (persisted to .mongo-data)...");
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const dbPath = path.join(REPO_ROOT, ".mongo-data");
      fs.mkdirSync(dbPath, { recursive: true });
      memoryServer = await MongoMemoryServer.create({
        instance: { dbPath, storageEngine: "wiredTiger", dbName: "taqtiq" }
      });
      await mongoose.connect(memoryServer.getUri("taqtiq"));
      console.log(`[db] connected to embedded MongoDB -> ${mongoose.connection.name}`);
    }

    if (autoBootstrap) {
      await maybeBootstrap();
    }

    return mongoose.connection;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

/**
 * Starts the dataset load when the database is empty. Deliberately not
 * awaited - the API stays responsive and the client polls
 * `GET /api/admin/status` for progress.
 */
async function maybeBootstrap() {
  try {
    const { isSeeded, bootstrapDatabase, refreshCounts } = await import(
      "../../../database/bootstrap.js"
    );
    if (await isSeeded()) {
      await refreshCounts();
      console.log("[db] dataset already present - skipping load.");
      return;
    }
    console.log("[db] database is empty - loading the dataset in the background...");
    bootstrapDatabase().catch((err) => console.error("[db] auto-load failed:", err.message));
  } catch (err) {
    console.error("[db] auto-load could not start:", err.message);
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
