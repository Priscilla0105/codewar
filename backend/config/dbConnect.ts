import mongoose from "mongoose";

let isConnected = false;

export async function dbConnect() {
  if (isConnected) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  const isPlaceholder = !uri || 
    uri.includes("YOUR_USERNAME") || 
    uri.includes("YOUR_PASSWORD") || 
    uri.includes("<username>") || 
    uri.includes("<password>") ||
    uri.trim() === "";

  if (isPlaceholder) {
    console.log("[DB] MONGODB_URI is not configured with real Atlas credentials. Operating in fast local JSON/memory fallback mode.");
    return null;
  }

  try {
    mongoose.connection.on("connected", () => {
      console.log("🔌 MongoDB Atlas connected successfully.");
      isConnected = true;
    });

    mongoose.connection.on("error", (err) => {
      console.log("[DB] MongoDB Atlas connection status log:", err.message || err);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB Atlas disconnected. Attempting auto-reconnection...");
      isConnected = false;
    });

    await mongoose.connect(uri, {
      autoIndex: true,
      connectTimeoutMS: 3000,
      socketTimeoutMS: 45000,
    });

    return mongoose.connection;
  } catch (error: any) {
    console.log("[DB] MongoDB Atlas connection could not be established (using local JSON storage fallback). Msg:", error.message || error);
    return null;
  }
}
