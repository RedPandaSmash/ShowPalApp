import connectDB from "../../../lib/mongodb.js";
import Reply from "../../../lib/models/reply.model.js";
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

    const { replyId } = req.query;
    const { action } = req.query; // 'like' for like operations

    if (req.method === 'GET') {
      // Get specific reply
      const reply = await Reply.findById(replyId).populate("userID", "username");
      if (!reply) {
        return res.status(404).json({ error: "Reply not found" });
      }
      return res.json({ reply });
    }

    // All other methods require authentication
    await runMiddleware(req, res, validateSession);
    const userID = req.user._id;

    if (req.method === 'POST' && action === 'like') {
      // Add like
      const reply = await Reply.findById(replyId);
      if (!reply) {
        return res.status(404).json({ error: "Reply not found" });
      }

      if (!reply.likes.includes(userID)) {
        reply.likes.push(userID);
        await reply.save();
      }
      return res.json({ liked: true, likesCount: reply.likes.length });
    }

    if (req.method === 'DELETE' && action === 'like') {
      // Remove like
      const reply = await Reply.findById(replyId);
      if (!reply) {
        return res.status(404).json({ error: "Reply not found" });
      }

      reply.likes = reply.likes.filter(id => id.toString() !== userID.toString());
      await reply.save();
      return res.json({ liked: false, likesCount: reply.likes.length });
    }

    if (req.method === 'PUT') {
      // Update reply
      const { comment } = req.body;

      const reply = await Reply.findById(replyId);
      if (!reply) {
        return res.status(404).json({ error: "Reply not found" });
      }

      if (reply.userID.toString() !== userID.toString()) {
        return res.status(403).json({ error: "Not authorized to edit this reply" });
      }

      if (comment !== undefined) {
        if (comment.trim().length === 0) {
          return res.status(400).json({ error: "Comment cannot be empty" });
        }
        reply.comment = comment.trim();
      }

      const updatedReply = await reply.save();
      await updatedReply.populate("userID", "username");
      return res.json({ reply: updatedReply });
    }

    if (req.method === 'DELETE' && !action) {
      // Delete reply
      const reply = await Reply.findById(replyId);
      if (!reply) {
        return res.status(404).json({ error: "Reply not found" });
      }

      if (reply.userID.toString() !== userID.toString()) {
        return res.status(403).json({ error: "Not authorized to delete this reply" });
      }

      await Reply.findByIdAndDelete(replyId);
      return res.json({ message: "Reply deleted successfully" });
    }
  } catch (error) {
    console.error("Error in reply management endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}