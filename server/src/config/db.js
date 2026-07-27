import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/football_analytics";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`[db] connected -> ${mongoose.connection.name}`);
  } catch (err) {
    console.error(`[db] connection failed: ${err.message}`);
    console.error(
      "[db] NOTE: installing MongoDB Compass alone doesn't run a database - Compass is just a viewer. " +
        "Make sure the MongoDB Community Server (mongod) is actually installed and running locally, " +
        "or point MONGO_URI at a MongoDB Atlas cluster instead."
    );
    console.error("[db] the API will keep running and fall back to live upstream calls without caching.");
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
