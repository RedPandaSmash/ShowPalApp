import connectDB from "../../../lib/mongodb.js";
import DefaultList from "../../../lib/models/defaultList.model.js";
import Profile from "../../../lib/models/profile.model.js";
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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    await runMiddleware(req, res, validateSession);

    const { listType } = req.query;
    const { showID } = req.body;
    const userID = req.user._id;

    if (!showID) {
      return res.status(400).json({ error: "Show ID is required" });
    }

    // Find the list
    const list = await DefaultList.findOne({ userID, listType });
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    // Check if show is already in the list
    const showIndex = (list.shows || []).findIndex(
      (s) => String(s) === String(showID)
    );

    if (showIndex === -1) {
      // Add to the list
      // If adding to a status list (Watching, Finished, Dropped), remove from other status lists
      if (["Watching", "Finished", "Dropped"].includes(listType)) {
        await DefaultList.updateMany(
          { userID, listType: { $in: ["Watching", "Finished", "Dropped"] } },
          { $pull: { shows: showID } }
        );
      }

      list.shows = [...(list.shows || []), String(showID)];

      // Add activity to user's profile history
      try {
        let actionType = "added_favorite";
        if (listType === "Watching") actionType = "added_to_watching";
        else if (listType === "Finished") actionType = "added_to_finished";
        else if (listType === "Dropped") actionType = "added_to_dropped";

        await Profile.updateOne(
          { userID },
          {
            $push: {
              history: {
                action: actionType,
                targetType: "show",
                targetID: String(showID),
                showID: String(showID),
                timestamp: new Date(),
                details: `Added show ${showID} to ${listType} list`,
              },
            },
          }
        );
      } catch (profileError) {
        console.error("Error adding list activity to profile:", profileError);
      }
    } else {
      // Remove from the list
      list.shows = (list.shows || []).filter(
        (s) => String(s) !== String(showID)
      );

      // Add removal activity to profile history
      try {
        if (listType === "Favorites") {
          await Profile.updateOne(
            { userID },
            {
              $push: {
                history: {
                  action: "removed_from_favorites",
                  targetType: "show",
                  targetID: String(showID),
                  showID: String(showID),
                  timestamp: new Date(),
                  details: `Removed show ${showID} from ${listType} list`,
                },
              },
            }
          );
        }
      } catch (profileError) {
        console.error(
          "Error updating list activity from profile:",
          profileError
        );
      }
    }

    await list.save();

    res.json({
      message: showIndex === -1 ? "Show added to list" : "Show removed from list",
      list,
      action: showIndex === -1 ? "added" : "removed",
    });
  } catch (error) {
    console.error("Error toggling show in list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}