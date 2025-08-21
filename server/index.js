import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/user.route.js";
// import roomRoutes from "./routes/room.route.js";
// import messageRoutes from "./routes/message.route.js";
import "dotenv/config";
import showRoutes from "./routes/show.route.js";

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

// use show routes
app.use("/api/shows", showRoutes);

app.get("/api/users", (req, res) => {
  res.send(`${User}`);
});

app.listen(PORT, () => {
  console.log(`Server is live`);
});
