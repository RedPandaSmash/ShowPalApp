import { router } from "express";
import Profile from "../models/profile.model.js";
import User from "../models/user.model.js";
import validateSession from "../middleware/validatesession.js";

const router = Router();

// GET /api/profile/:userID
router.get("/:userID", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      userID: req.params.userID,
    }).populate("userID", "username email");
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/profile -> create or update profile (authenticated)
router.post("/", validateSession, async (req, res) => {
  const { bio } = req.body;
  const userID = req.user._id;

  try {
    let profile = await Profile.findOne({ userID });
    if (profile) {
      // Update existing profile
      profile.bio = bio;
    } else {
      // Create new profile
      profile = new Profile({ userID, bio });
    }
    await profile.save();
    res.json(profile);
  } catch (error) {
    console.error("Error creating/updating profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
