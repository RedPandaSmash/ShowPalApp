import connectDB from "../../lib/mongodb.js";
import Reply from "../../lib/models/reply.model.js";
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
      // Get replies for a parent (review or reply)
      const { parentID, parentModel } = req.query;
      
      if (!parentID) {
        return res.status(400).json({ error: "parentID is required" });
      }

      let query = { parentID };
      if (parentModel) {
        query.parentModel = parentModel;
      }

      const replies = await Reply.find(query)
        .populate("userID", "username")
        .sort({ created_at: 1 }) // Oldest first for thread-like display
        .limit(100);

      return res.json({ replies });
    }

    if (req.method === 'POST') {
      // Create new reply (requires authentication)
      await runMiddleware(req, res, validateSession);

      const { parentID, parentModel, comment } = req.body;
      const userID = req.user._id;

      if (!parentID || !parentModel || !comment) {
        return res.status(400).json({ error: "parentID, parentModel, and comment are required" });
      }

      if (!['Review', 'Reply'].includes(parentModel)) {
        return res.status(400).json({ error: "parentModel must be 'Review' or 'Reply'" });
      }

      if (comment.trim().length === 0) {
        return res.status(400).json({ error: "Comment cannot be empty" });
      }

      const newReply = new Reply({
        parentID,
        parentModel,
        userID,
        comment: comment.trim(),
      });

      const savedReply = await newReply.save();
      await savedReply.populate("userID", "username");

      return res.status(201).json({ reply: savedReply });
    }
  } catch (error) {
    console.error("Error in replies endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}