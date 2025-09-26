import connectDB from "../../lib/mongodb.js";
import Review from "../../lib/models/review.model.js";
import validateSession from "../../lib/middleware/validatesession.js";

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
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    if (req.method === 'GET') {
      // Get reviews with optional showID filter
      const { showID } = req.query;
      
      let query = {};
      if (showID) {
        query.showID = showID;
      }

      const reviews = await Review.find(query)
        .populate("userID", "username")
        .sort({ created_at: -1 })
        .limit(50);

      return res.json({ reviews });
    }

    if (req.method === 'POST') {
      // Create new review (requires authentication)
      await runMiddleware(req, res, validateSession);

      const { showID, rating, comment } = req.body;
      const userID = req.user._id;

      if (!showID || !rating) {
        return res.status(400).json({ error: "showID and rating are required" });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      // Check if user already reviewed this show
      const existingReview = await Review.findOne({ showID, userID });
      if (existingReview) {
        return res.status(400).json({ error: "You have already reviewed this show" });
      }

      const newReview = new Review({
        showID,
        userID,
        rating,
        comment: comment || "",
      });

      const savedReview = await newReview.save();
      await savedReview.populate("userID", "username");

      return res.status(201).json({ review: savedReview });
    }
  } catch (error) {
    console.error("Error in reviews endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}