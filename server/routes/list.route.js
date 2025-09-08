import { Router } from "express";
import List from "../models/list.model.js";
import Profile from "../models/profile.model.js";
import validateSession from "../middleware/validatesession.js";

const router = Router();

// Create list (authenticated)
router.post("/", validateSession, async (req, res) => {
  try {
    const { name, shows = [] } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const newList = new List({ userID: req.user._id, name, shows });
    const saved = await newList.save();

    // Add activity to user's profile history
    try {
      const activities = [
        {
          action: "created_list",
          targetType: "list",
          targetID: saved._id,
          timestamp: new Date(),
          details: `Created list "${name}" with ${shows.length} shows`,
        },
      ];

      // Add activities for each show that was added to the list
      if (shows && shows.length > 0) {
        shows.forEach((showID) => {
          activities.unshift({
            action: "added_to_list",
            targetType: "list",
            targetID: saved._id,
            showID: String(showID),
            timestamp: new Date(),
            details: `Added show ${showID} to new list "${name}"`,
          });
        });
      }

      await Profile.updateOne(
        { userID: req.user._id },
        {
          $push: {
            history: {
              $each: activities,
            },
          },
        }
      );
    } catch (profileError) {
      console.error(
        "Error adding list creation activity to profile:",
        profileError
      );
      // Don't fail the list creation if profile update fails
    }

    return res.status(201).json(saved);
  } catch (err) {
    console.error("create list error", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// Get lists, optional filter by userID or mine=true
router.get("/", async (req, res) => {
  try {
    const { userID, mine } = req.query;
    const filter = {};
    if (mine === "true" && req.user) filter.userID = req.user._id;
    else if (userID) filter.userID = userID;
    const lists = await List.find(filter).sort({ created_at: -1 });
    return res.status(200).json({ lists });
  } catch (err) {
    console.error("get lists error", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// Get single list
router.get("/:id", async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ error: "List not found" });
    return res.status(200).json(list);
  } catch (err) {
    console.error("get list error", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// Update list (owner only)
router.put("/:id", validateSession, async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ error: "List not found" });
    if (String(list.userID) !== String(req.user._id))
      return res.status(403).json({ error: "forbidden" });
    const { name, shows } = req.body;
    if (name !== undefined) list.name = name;
    if (shows !== undefined) list.shows = shows;
    const saved = await list.save();
    return res.status(200).json(saved);
  } catch (err) {
    console.error("update list error", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// Delete list (owner only)
router.delete("/:id", validateSession, async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ error: "List not found" });
    if (String(list.userID) !== String(req.user._id))
      return res.status(403).json({ error: "forbidden" });
    // use findByIdAndDelete to avoid calling potentially-missing instance methods
    await List.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    // log full stack for debugging
    console.error("delete list error", err && err.stack ? err.stack : err);
    // return the real error message to the client during dev to help diagnosis
    return res.status(500).json({
      error: err && err.message ? err.message : "internal server error",
    });
  }
});

// Toggle a show in the list (authenticated + owner)
router.post("/:id/toggle-show", validateSession, async (req, res) => {
  try {
    const { showID } = req.body;
    if (!showID) return res.status(400).json({ error: "showID required" });
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ error: "List not found" });
    if (String(list.userID) !== String(req.user._id))
      return res.status(403).json({ error: "forbidden" });

    const idx = (list.shows || []).findIndex(
      (s) => String(s) === String(showID)
    );
    if (idx === -1) {
      // add
      list.shows = [...(list.shows || []), String(showID)];

      // Add activity to profile history
      try {
        await Profile.updateOne(
          { userID: req.user._id },
          {
            $push: {
              history: {
                action: "added_to_list",
                targetType: "list",
                targetID: req.params.id,
                showID: String(showID),
                timestamp: new Date(),
                details: `Added show ${showID} to list "${list.name}"`,
              },
            },
          }
        );
      } catch (profileError) {
        console.error("Error adding activity to profile:", profileError);
      }
    } else {
      // remove
      list.shows = (list.shows || []).filter(
        (s) => String(s) !== String(showID)
      );

      // Add removal activity to profile history
      try {
        await Profile.updateOne(
          { userID: req.user._id },
          {
            $push: {
              history: {
                action: "removed_from_list",
                targetType: "list",
                targetID: req.params.id,
                showID: String(showID),
                timestamp: new Date(),
                details: `Removed show ${showID} from list "${list.name}"`,
              },
            },
          }
        );
      } catch (profileError) {
        console.error(
          "Error adding removal activity to profile:",
          profileError
        );
      }
    }
    const saved = await list.save();
    return res.status(200).json(saved);
  } catch (err) {
    console.error("toggle show error", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

export default router;
