import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/user.route.js";
import profileRoutes from "./routes/profile.route.js";
import defaultListRoutes from "./routes/defaultList.route.js";
// import roomRoutes from "./routes/room.route.js";
// import messageRoutes from "./routes/message.route.js";
import "dotenv/config";
import showRoutes from "./routes/show.route.js";
import reviewRoutes from "./routes/review.route.js";
import replyRoutes from "./routes/reply.route.js";
import listRoutes from "./routes/list.route.js";

const PORT = process.env.PORT || 8080;
// Accept several common environment variable names and prefer the first one set
const MONGO =
  process.env.MONGO ||
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL;

// Fail fast with a helpful message if the connection string is missing
if (!MONGO) {
  console.error(
    "Missing MongoDB connection string. Set MONGO (or MONGO_URI / MONGODB_URI / DATABASE_URL) environment variable."
  );
  console.error(
    "You can create a server/.env file or set the variable in your environment."
  );
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

// Log a short, non-sensitive preview of the URI so it's easier to debug locally
console.log("Using MongoDB URI from env (first 60 chars):", MONGO.slice(0, 60));

// connect to mongodb
const connectDB = async () => {
  try {
    const connect = await mongoose.connect(MONGO);

    console.log("Connected to mongodb!");
  } catch (error) {
    console.error("Error" + error);
    process.exit(1);
  }
};

connectDB();

app.get("/api/health", (req, res) => {
  res.send("We good");
});

// use user routes
app.use("/api/users", userRoutes);

// use profile routes
app.use("/api/profile", profileRoutes);

// use default list routes
app.use("/api/default-lists", defaultListRoutes);

// use show routes
app.use("/api/shows", showRoutes);

// use review routes
app.use("/api/reviews", reviewRoutes);

// use reply routes
app.use("/api/replies", replyRoutes);

// use list routes
app.use("/api/lists", listRoutes);

app.listen(PORT, () => {
  console.log(`Server is live`);
});
