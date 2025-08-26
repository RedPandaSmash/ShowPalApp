import { Router } from "express";
import Review from "../models/Review.js";
import User from "../models/user.model.js";
import validateSession from "../middleware/validatesession.js";

const router = Router();

// POST /api/reviews
router.post("/", validateSession, async (req, res) => {
  const { showID, rating, comment } = req.body;

  try {
    const userID = req.user._id;
    const newReview = new Review({ showID, userID, rating, comment });

    await newReview.save();

    return res.status(201).json(newReview);
  } catch (err) {
    console.error("Error creating review:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

export default router;
