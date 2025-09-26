import connectDB from "../../lib/mongodb.js";
import Profile from "../../lib/models/profile.model.js";
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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    await runMiddleware(req, res, validateSession);

    const { bio } = req.body;
    const userID = req.user._id;

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
}