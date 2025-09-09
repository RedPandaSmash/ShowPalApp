import { Router } from "express";
import Review from "../models/review.model.js";
import User from "../models/user.model.js";
import Profile from "../models/profile.model.js";
import validateSession from "../middleware/validatesession.js";

const router = Router();

// POST /api/reviews
router.post("/", validateSession, async (req, res) => {
  const { showID, rating, comment } = req.body;

  try {
    const userID = req.user._id;

    const newReview = new Review({ showID, userID, rating, comment, likes: 0 });

    const savedReview = await newReview.save();

    // Add activity to user's profile history
    try {
      await Profile.updateOne(
        { userID },
        {
          $push: {
            history: {
              action: "left_review",
              targetType: "review",
              targetID: savedReview._id,
              showID: showID,
              timestamp: new Date(),
              details: `Left a ${rating}-star review for show ${showID}`,
            },
          },
        }
      );
    } catch (profileError) {
      console.error("Error adding review activity to profile:", profileError);
      // Don't fail the review creation if profile update fails
    }

    return res.status(201).json(savedReview);
  } catch (err) {
    console.error("Error creating review:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { showID } = req.query;
    const filter = {};
    if (showID) filter.showID = String(showID);
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .populate("userID", "username");
    res.status(200).json({ reviews, message: "review found" });
  } catch (error) {
    console.error(error);
  }
});

// POST /api/reviews/:id/like -> toggle like/unlike for authenticated user
router.post("/:id/like", validateSession, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found" });

    const userId = req.user._id;
    const hasLiked =
      review.likedBy &&
      review.likedBy.some((id) => String(id) === String(userId));

    if (hasLiked) {
      // unlike
      review.likedBy = review.likedBy.filter(
        (id) => String(id) !== String(userId)
      );
      review.likes = Math.max(0, (review.likes || 0) - 1);

      // Remove unlike activity from profile history
      try {
        await Profile.updateOne(
          { userID: userId },
          {
            $pull: {
              history: {
                action: "liked_review",
                targetID: review._id.toString(),
              },
            },
          }
        );
      } catch (profileError) {
        console.error(
          "Error removing review like activity from profile:",
          profileError
        );
      }
    } else {
      // like
      review.likedBy = review.likedBy || [];
      review.likedBy.push(userId);
      review.likes = (review.likes || 0) + 1;

      // Add like activity to user's profile history
      try {
        await Profile.updateOne(
          { userID: userId },
          {
            $push: {
              history: {
                action: "liked_review",
                targetType: "review",
                targetID: review._id.toString(),
                showID: review.showID,
                timestamp: new Date(),
                details: `Liked a review for show ${review.showID}`,
              },
            },
          }
        );
      } catch (profileError) {
        console.error(
          "Error adding review like activity to profile:",
          profileError
        );
      }
    }

    await review.save();
    return res.status(200).json(review);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal server error" });
  }
});
export default router;
