import { Router } from "express";
import DefaultList from "../models/defaultList.model.js";
import Profile from "../models/profile.model.js";
import validateSession from "../middleware/validatesession.js";

const router = Router();

// GET /api/default-lists/:userID -> get all default lists for a user
router.get("/:userID", async (req, res) => {
  try {
    const lists = await DefaultList.find({ userID: req.params.userID });
    res.json(lists);
  } catch (error) {
    console.error("Error fetching default lists:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/default-lists/:userID/:listType -> get specific default list
router.get("/:userID/:listType", async (req, res) => {
  try {
    const list = await DefaultList.findOne({
      userID: req.params.userID,
      listType: req.params.listType,
    });

    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    res.json(list);
  } catch (error) {
    console.error("Error fetching default list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/default-lists/:listType/toggle-show -> toggle show in default list (authenticated)
router.post("/:listType/toggle-show", validateSession, async (req, res) => {
  const { showID } = req.body;
  const userID = req.user._id;
  const listType = req.params.listType;

  if (!showID) {
    return res.status(400).json({ error: "Show ID is required" });
  }

  try {
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
        let actionType = "removed_from_favorites";
        if (listType === "Watching")
          actionType =
            "added_to_watching"; // Keep existing for backwards compatibility
        else if (listType === "Finished") actionType = "added_to_finished";
        else if (listType === "Dropped") actionType = "added_to_dropped";

        if (listType === "Favorites") {
          // For favorites, add removal activity
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
                  details: `Removed show ${showID} from ${listType} list`,
                },
              },
            }
          );
        } else {
          // For status lists, remove the add activity (backwards compatibility)
          await Profile.updateOne(
            { userID },
            {
              $pull: {
                history: {
                  action: actionType,
                  targetID: String(showID),
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

    const saved = await list.save();
    return res.status(200).json(saved);
  } catch (error) {
    console.error("Error toggling show in list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/default-lists/:listType/update -> update default list (authenticated)
router.put("/:listType/update", validateSession, async (req, res) => {
  const { shows } = req.body;
  const userID = req.user._id;
  const listType = req.params.listType;

  try {
    const result = await DefaultList.updateOne(
      { userID, listType },
      { shows: shows || [] }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "List not found" });
    }

    res.json({ message: `${listType} list updated successfully` });
  } catch (error) {
    console.error("Error updating default list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/default-lists/move -> move show between status lists (authenticated)
router.post("/move", validateSession, async (req, res) => {
  const { showID, fromListType, toListType } = req.body;
  const userID = req.user._id;

  if (!showID || !fromListType || !toListType) {
    return res.status(400).json({
      error: "Show ID, from list type, and to list type are required",
    });
  }

  try {
    await DefaultList.moveShowBetweenStatusLists(
      userID,
      showID,
      fromListType,
      toListType
    );
    res.json({ message: `Show moved from ${fromListType} to ${toListType}` });
  } catch (error) {
    console.error("Error moving show between lists:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export default router;
