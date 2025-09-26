import connectDB from "../../../lib/mongodb.js";
import Profile from "../../../lib/models/profile.model.js";
import DefaultList from "../../../lib/models/defaultList.model.js";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();

    const { userID } = req.query;

    const profile = await Profile.findOne({
      userID: userID,
    }).populate("userID", "username email");

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Calculate watch stats from actual list counts
    const watchingList = await DefaultList.findOne({
      userID: userID,
      listType: "Watching",
    });
    const finishedList = await DefaultList.findOne({
      userID: userID,
      listType: "Finished",
    });
    const droppedList = await DefaultList.findOne({
      userID: userID,
      listType: "Dropped",
    });

    // Update profile with calculated stats
    profile.watchStats.watching = watchingList ? watchingList.shows.length : 0;
    profile.watchStats.finished = finishedList ? finishedList.shows.length : 0;
    profile.watchStats.dropped = droppedList ? droppedList.shows.length : 0;

    // Update the profile in the database without saving the populated document
    await Profile.updateOne(
      { userID: userID },
      {
        $set: {
          "watchStats.watching": profile.watchStats.watching,
          "watchStats.finished": profile.watchStats.finished,
          "watchStats.dropped": profile.watchStats.dropped,
        },
      }
    );

    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}