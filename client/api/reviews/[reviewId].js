import connectDB from "../../../lib/mongodb.js";
import Review from "../../../lib/models/review.model.js";
import validateSession from "../../../lib/middleware/validatesession.js";

// Helper function to run middleware
async function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { reviewId } = req.query;
    const { action } = req.query; // 'like' for like operations

    if (req.method === 'GET') {
      // Get specific review
      const review = await Review.findById(reviewId).populate("userID", "username");
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      return res.json({ review });
    }

    // All other methods require authentication
    await runMiddleware(req, res, validateSession);
    const userID = req.user._id;

    if (req.method === 'POST' && action === 'like') {
      // Add like
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      if (!review.likes.includes(userID)) {
        review.likes.push(userID);
        await review.save();
      }
      return res.json({ liked: true, likesCount: review.likes.length });
    }

    if (req.method === 'DELETE' && action === 'like') {
      // Remove like
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      review.likes = review.likes.filter(id => id.toString() !== userID.toString());
      await review.save();
      return res.json({ liked: false, likesCount: review.likes.length });
    }

    if (req.method === 'PUT') {
      // Update review
      const { rating, comment } = req.body;

      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      if (review.userID.toString() !== userID.toString()) {
        return res.status(403).json({ error: "Not authorized to edit this review" });
      }

      if (rating !== undefined) {
        if (rating < 1 || rating > 5) {
          return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }
        review.rating = rating;
      }

      if (comment !== undefined) {
        review.comment = comment;
      }

      const updatedReview = await review.save();
      await updatedReview.populate("userID", "username");
      return res.json({ review: updatedReview });
    }

    if (req.method === 'DELETE') {
      // Delete review
      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      if (review.userID.toString() !== userID.toString()) {
        return res.status(403).json({ error: "Not authorized to delete this review" });
      }

      await Review.findByIdAndDelete(reviewId);
      return res.json({ message: "Review deleted successfully" });
    }
  } catch (error) {
    console.error("Error in review management endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}