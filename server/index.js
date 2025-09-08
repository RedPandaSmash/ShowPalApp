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
const MONGO = process.env.MONGO;

const app = express();

app.use(cors());
app.use(express.json());

console.log(MONGO);

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
