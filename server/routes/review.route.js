import { Router } from "express";
import Review from "../models/review.model.js";
import User from "../models/user.model.js";
import validateSession from "../middleware/validatesession.js";

const router = Router();

// POST /api/reviews
router.post("/", validateSession, async (req, res) => {
  const { showID, rating, comment } = req.body;

  try {
    const userID = req.user._id;

    const newReview = new Review({ showID, userID, rating, comment });

    const savedReview = await newReview.save();

    return res.status(201).json(savedReview);
  } catch (err) {
    console.error("Error creating review:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find();
    res.status(200).json({
      reviews: reviews,
      message: "review found",
    });
  } catch (error) {
    console.error(error);
  }
});
export default router;
