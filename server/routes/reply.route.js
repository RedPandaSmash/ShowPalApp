import { Router } from "express";
import Reply from "../models/reply.model.js";
import Profile from "../models/profile.model.js";
import validateSession from "../middleware/validatesession.js";

const router = Router();

// POST /api/replies -> create reply (must be authenticated)
router.post("/", validateSession, async (req, res) => {
  try {
    const { parentID, parentModel, comment } = req.body;
    if (!parentID || !parentModel || !comment)
      return res.status(400).json({ error: "missing fields" });
    const userID = req.user._id;
    const newReply = new Reply({
      parentID,
      parentModel,
      userID,
      comment,
      likes: 0,
    });
    const saved = await newReply.save();

    // Add activity to user's profile history
    try {
      await Profile.updateOne(
        { userID },
        {
          $push: {
            history: {
              action: "left_reply",
              targetType: "reply",
              targetID: saved._id,
              timestamp: new Date(),
              details: `Replied to a ${parentModel.toLowerCase()}`,
            },
          },
        }
      );
    } catch (profileError) {
      console.error("Error adding reply activity to profile:", profileError);
      // Don't fail the reply creation if profile update fails
    }

    return res.status(201).json(saved);
  } catch (err) {
    console.error("create reply error", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// GET /api/replies/:id -> get single reply by ID
router.get("/:id", async (req, res) => {
  try {
    const reply = await Reply.findById(req.params.id)
      .populate("userID", "username")
      .populate({
        path: "parentID",
        populate: { path: "userID", select: "username" },
      });
    if (!reply) return res.status(404).json({ error: "Reply not found" });
    return res.status(200).json(reply);
  } catch (err) {
    console.error("get single reply error", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// GET /api/replies?parentID=... -> list replies for a parent (oldest->newest)
router.get("/", async (req, res) => {
  try {
    const { parentID } = req.query;
    if (!parentID) return res.status(400).json({ error: "parentID required" });
    const replies = await Reply.find({ parentID: String(parentID) })
      .sort({ created_at: 1 })
      .populate("userID", "username")
      .populate({
        path: "parentID",
        populate: { path: "userID", select: "username" },
      });
    return res.status(200).json({ replies });
  } catch (err) {
    console.error("get replies error", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// POST /api/replies/:id/like -> toggle like (authenticated)
router.post("/:id/like", validateSession, async (req, res) => {
  try {
    const reply = await Reply.findById(req.params.id);
    if (!reply) return res.status(404).json({ error: "Reply not found" });
    const userId = req.user._id;
    const hasLiked =
      reply.likedBy &&
      reply.likedBy.some((id) => String(id) === String(userId));

    if (hasLiked) {
      reply.likedBy = reply.likedBy.filter(
        (id) => String(id) !== String(userId)
      );
      reply.likes = Math.max(0, (reply.likes || 0) - 1);

      // Remove unlike activity from profile history
      try {
        await Profile.updateOne(
          { userID: userId },
          {
            $pull: {
              history: {
                action: "liked_reply",
                targetID: reply._id.toString(),
              },
            },
          }
        );
      } catch (profileError) {
        console.error(
          "Error removing reply like activity from profile:",
          profileError
        );
      }
    } else {
      reply.likedBy = reply.likedBy || [];
      reply.likedBy.push(userId);
      reply.likes = (reply.likes || 0) + 1;

      // Add like activity to user's profile history
      try {
        await Profile.updateOne(
          { userID: userId },
          {
            $push: {
              history: {
                action: "liked_reply",
                targetType: "reply",
                targetID: reply._id.toString(),
                timestamp: new Date(),
                details: `Liked a reply to a ${reply.parentModel.toLowerCase()}`,
              },
            },
          }
        );
      } catch (profileError) {
        console.error(
          "Error adding reply like activity to profile:",
          profileError
        );
      }
    }

    await reply.save();
    return res.status(200).json(reply);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal server error" });
  }
});

export default router;
