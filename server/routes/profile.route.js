import { Router } from "express";
import Profile from "../models/profile.model.js";
import User from "../models/user.model.js";
import Review from "../models/review.model.js";
import Reply from "../models/reply.model.js";
import List from "../models/list.model.js";
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

    // Import DefaultList model for watch stats calculation
    const DefaultList = (await import("../models/defaultList.model.js"))
      .default;

    // Calculate watch stats from actual list counts
    const watchingList = await DefaultList.findOne({
      userID: req.params.userID,
      listType: "Watching",
    });
    const finishedList = await DefaultList.findOne({
      userID: req.params.userID,
      listType: "Finished",
    });
    const droppedList = await DefaultList.findOne({
      userID: req.params.userID,
      listType: "Dropped",
    });

    // Update profile with calculated stats
    profile.watchStats.watching = watchingList ? watchingList.shows.length : 0;
    profile.watchStats.finished = finishedList ? finishedList.shows.length : 0;
    profile.watchStats.dropped = droppedList ? droppedList.shows.length : 0;

    // Update the profile in the database without saving the populated document
    await Profile.updateOne(
      { userID: req.params.userID },
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

// POST /api/profile/:userID/follow -> follow a user (authenticated)
router.post("/:userID/follow", validateSession, async (req, res) => {
  const targetUserID = req.params.userID;
  const currentUserID = req.user._id;

  if (targetUserID === currentUserID.toString()) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }

  try {
    // Check if target user exists
    const targetUser = await User.findById(targetUserID);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Add target user to current user's following list
    await Profile.updateOne(
      { userID: currentUserID },
      { $addToSet: { following: targetUserID } }
    );

    // Add current user to target user's followers list
    await Profile.updateOne(
      { userID: targetUserID },
      { $addToSet: { followers: currentUserID } }
    );

    res.json({ message: "Successfully followed user" });
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/profile/:userID/follow -> unfollow a user (authenticated)
router.delete("/:userID/follow", validateSession, async (req, res) => {
  const targetUserID = req.params.userID;
  const currentUserID = req.user._id;

  try {
    // Remove target user from current user's following list
    await Profile.updateOne(
      { userID: currentUserID },
      { $pull: { following: targetUserID } }
    );

    // Remove current user from target user's followers list
    await Profile.updateOne(
      { userID: targetUserID },
      { $pull: { followers: currentUserID } }
    );

    res.json({ message: "Successfully unfollowed user" });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/profile/:userID/followers -> get user's followers
router.get("/:userID/followers", async (req, res) => {
  try {
    const profile = await Profile.findOne({ userID: req.params.userID })
      .populate("followers", "username")
      .select("followers");

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(profile.followers);
  } catch (error) {
    console.error("Error fetching followers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/profile/:userID/following -> get users that this user follows
router.get("/:userID/following", async (req, res) => {
  try {
    const profile = await Profile.findOne({ userID: req.params.userID })
      .populate("following", "username")
      .select("following");

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(profile.following);
  } catch (error) {
    console.error("Error fetching following:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/profile/:userID/activity -> get user's recent activity (enriched)
router.get("/:userID/activity", async (req, res) => {
  try {
    const profile = await Profile.findOne({ userID: req.params.userID });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Filter for activities we want to display
    const relevantActivities = profile.history.filter((activity) =>
      [
        "left_review",
        "left_reply",
        "created_list",
        "liked_review",
        "liked_reply",
        "added_to_watching",
        "added_to_finished",
        "added_to_dropped",
        "added_favorite",
        "moved_from_watching_to_finished",
        "moved_from_watching_to_dropped",
        "moved_from_finished_to_watching",
        "moved_from_finished_to_dropped",
        "moved_from_dropped_to_watching",
        "moved_from_dropped_to_finished",
        "removed_from_favorites",
        "removed_from_list",
        "added_to_list",
      ].includes(activity.action)
    );

    // Sort by timestamp (newest first)
    relevantActivities.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Enrich activities with related data
    const enrichedActivities = await Promise.all(
      relevantActivities.slice(0, 20).map(async (activity) => {
        const enriched = {
          ...activity.toObject(),
          enrichedData: null,
        };

        try {
          switch (activity.action) {
            case "left_review":
              const review = await Review.findById(activity.targetID).populate(
                "userID",
                "username"
              );
              if (review) {
                enriched.enrichedData = {
                  rating: review.rating,
                  comment: review.comment,
                  showID: review.showID,
                };
              }
              break;

            case "left_reply":
              const reply = await Reply.findById(activity.targetID).populate(
                "userID",
                "username"
              );
              if (reply) {
                // Find the showID by traversing up to the root review
                let showID = null;
                let currentParentID = reply.parentID;
                let currentParentModel = reply.parentModel;
                let parentUsername = null;
                let parentUserID = null;

                // Traverse up the reply chain to find the root review
                while (currentParentID && !showID) {
                  if (currentParentModel === "Review") {
                    const parentReview = await Review.findById(
                      currentParentID
                    ).populate("userID", "username");
                    if (parentReview) {
                      showID = parentReview.showID;
                      parentUsername = parentReview.userID.username;
                      parentUserID = parentReview.userID._id.toString();
                    }
                  } else if (currentParentModel === "Reply") {
                    const parentReply = await Reply.findById(
                      currentParentID
                    ).populate("userID", "username");
                    if (parentReply) {
                      currentParentID = parentReply.parentID;
                      currentParentModel = parentReply.parentModel;
                      parentUsername = parentReply.userID.username;
                      parentUserID = parentReply.userID._id.toString();
                    } else {
                      break;
                    }
                  } else {
                    break;
                  }
                }

                enriched.enrichedData = {
                  comment: reply.comment,
                  showID: showID,
                  replyID: reply._id.toString(),
                  parentUsername: parentUsername,
                  parentUserID: parentUserID,
                };
              }
              break;

            case "created_list":
              const list = await List.findById(activity.targetID).populate(
                "userID",
                "username"
              );
              if (list) {
                enriched.enrichedData = {
                  name: list.name,
                  showCount: list.shows.length,
                };
              }
              break;

            case "liked_review":
              const likedReview = await Review.findById(
                activity.targetID
              ).populate("userID", "username");
              if (likedReview) {
                enriched.enrichedData = {
                  showID: likedReview.showID,
                  reviewID: likedReview._id.toString(),
                  rating: likedReview.rating,
                };
              }
              break;

            case "liked_reply":
              const likedReply = await Reply.findById(
                activity.targetID
              ).populate("userID", "username");
              if (likedReply) {
                // Find the showID by traversing up to the root review
                let showID = null;
                let currentParentID = likedReply.parentID;
                let currentParentModel = likedReply.parentModel;

                // Traverse up the reply chain to find the root review
                while (currentParentID && !showID) {
                  if (currentParentModel === "Review") {
                    const parentReview = await Review.findById(currentParentID);
                    if (parentReview) {
                      showID = parentReview.showID;
                    }
                  } else if (currentParentModel === "Reply") {
                    const parentReply = await Reply.findById(currentParentID);
                    if (parentReply) {
                      currentParentID = parentReply.parentID;
                      currentParentModel = parentReply.parentModel;
                    } else {
                      break;
                    }
                  } else {
                    break;
                  }
                }

                enriched.enrichedData = {
                  showID: showID,
                  replyID: likedReply._id.toString(),
                };
              }
              break;

            case "added_to_watching":
            case "added_to_finished":
            case "added_to_dropped":
            case "added_favorite":
            case "moved_from_watching_to_finished":
            case "moved_from_watching_to_dropped":
            case "moved_from_finished_to_watching":
            case "moved_from_finished_to_dropped":
            case "moved_from_dropped_to_watching":
            case "moved_from_dropped_to_finished":
            case "removed_from_favorites":
            case "removed_from_list":
              // For list actions, the targetID is the showID
              enriched.enrichedData = {
                showID: activity.showID || activity.targetID,
              };
              break;

            case "added_to_list":
              // For list actions, targetID is the list ID, showID is the show ID
              const addedList = await List.findById(activity.targetID);
              if (addedList) {
                enriched.enrichedData = {
                  showID: activity.showID,
                  listName: addedList.name,
                  listID: activity.targetID,
                };
              } else {
                enriched.enrichedData = {
                  showID: activity.showID || activity.targetID,
                };
              }
              break;
          }
        } catch (error) {
          console.error(`Error enriching activity ${activity._id}:`, error);
          // Continue without enriched data if there's an error
        }

        return enriched;
      })
    );

    res.json({
      activities: enrichedActivities,
      total: relevantActivities.length,
    });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/profile/:userID/following-activity -> get activity from users this user follows
router.get("/:userID/following-activity", async (req, res) => {
  try {
    const profile = await Profile.findOne({ userID: req.params.userID });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Get all users that this user is following
    const followingUserIds = profile.following;

    if (followingUserIds.length === 0) {
      return res.json({
        activities: [],
        total: 0,
      });
    }

    // Fetch profiles of followed users with populated user data
    const followedProfiles = await Profile.find({
      userID: { $in: followingUserIds },
    }).populate("userID", "username");

    // Collect all activities from followed users
    let allActivities = [];
    followedProfiles.forEach((followedProfile) => {
      const relevantActivities = followedProfile.history.filter((activity) =>
        [
          "left_review",
          "left_reply",
          "created_list",
          "liked_review",
          "liked_reply",
          "added_to_watching",
          "added_to_finished",
          "added_to_dropped",
          "added_favorite",
          "moved_from_watching_to_finished",
          "moved_from_watching_to_dropped",
          "moved_from_finished_to_watching",
          "moved_from_finished_to_dropped",
          "moved_from_dropped_to_watching",
          "moved_from_dropped_to_finished",
          "removed_from_favorites",
          "removed_from_list",
          "added_to_list",
        ].includes(activity.action)
      );

      // Add user info to each activity
      const activitiesWithUser = relevantActivities.map((activity) => ({
        ...activity.toObject(),
        userID: followedProfile.userID._id.toString(),
        username: followedProfile.userID.username,
      }));

      allActivities = allActivities.concat(activitiesWithUser);
    });

    // Sort by timestamp (newest first)
    allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Enrich activities with related data
    const enrichedActivities = await Promise.all(
      allActivities.slice(0, 20).map(async (activity) => {
        const enriched = {
          ...activity,
          enrichedData: null,
        };

        try {
          switch (activity.action) {
            case "left_review":
              const review = await Review.findById(activity.targetID).populate(
                "userID",
                "username"
              );
              if (review) {
                enriched.enrichedData = {
                  rating: review.rating,
                  comment: review.comment,
                  showID: review.showID,
                  username: review.userID.username,
                };
              }
              break;

            case "left_reply":
              const reply = await Reply.findById(activity.targetID).populate(
                "userID",
                "username"
              );
              if (reply) {
                // Find the showID by traversing up to the root review
                let showID = null;
                let currentParentID = reply.parentID;
                let currentParentModel = reply.parentModel;
                let parentUsername = null;
                let parentUserID = null;

                // Traverse up the reply chain to find the root review
                while (currentParentID && !showID) {
                  if (currentParentModel === "Review") {
                    const parentReview = await Review.findById(
                      currentParentID
                    ).populate("userID", "username");
                    if (parentReview) {
                      showID = parentReview.showID;
                      parentUsername = parentReview.userID.username;
                      parentUserID = parentReview.userID._id.toString();
                    }
                  } else if (currentParentModel === "Reply") {
                    const parentReply = await Reply.findById(
                      currentParentID
                    ).populate("userID", "username");
                    if (parentReply) {
                      currentParentID = parentReply.parentID;
                      currentParentModel = parentReply.parentModel;
                      parentUsername = parentReply.userID.username;
                      parentUserID = parentReply.userID._id.toString();
                    } else {
                      break;
                    }
                  } else {
                    break;
                  }
                }

                enriched.enrichedData = {
                  comment: reply.comment,
                  showID: showID,
                  replyID: reply._id.toString(),
                  parentUsername: parentUsername,
                  parentUserID: parentUserID,
                  username: reply.userID.username,
                };
              }
              break;

            case "created_list":
              const list = await List.findById(activity.targetID).populate(
                "userID",
                "username"
              );
              if (list) {
                enriched.enrichedData = {
                  name: list.name,
                  showCount: list.shows.length,
                  username: list.userID.username,
                };
              }
              break;

            case "liked_review":
              const likedReview = await Review.findById(
                activity.targetID
              ).populate("userID", "username");
              if (likedReview) {
                enriched.enrichedData = {
                  showID: likedReview.showID,
                  reviewID: likedReview._id.toString(),
                  rating: likedReview.rating,
                  username: likedReview.userID.username,
                };
              }
              break;

            case "liked_reply":
              const likedReply = await Reply.findById(
                activity.targetID
              ).populate("userID", "username");
              if (likedReply) {
                // Find the showID by traversing up to the root review
                let showID = null;
                let currentParentID = likedReply.parentID;
                let currentParentModel = likedReply.parentModel;

                // Traverse up the reply chain to find the root review
                while (currentParentID && !showID) {
                  if (currentParentModel === "Review") {
                    const parentReview = await Review.findById(currentParentID);
                    if (parentReview) {
                      showID = parentReview.showID;
                    }
                  } else if (currentParentModel === "Reply") {
                    const parentReply = await Reply.findById(currentParentID);
                    if (parentReply) {
                      currentParentID = parentReply.parentID;
                      currentParentModel = parentReply.parentModel;
                    } else {
                      break;
                    }
                  } else {
                    break;
                  }
                }

                enriched.enrichedData = {
                  showID: showID,
                  replyID: likedReply._id.toString(),
                  username: likedReply.userID.username,
                };
              }
              break;

            case "added_to_watching":
            case "added_to_finished":
            case "added_to_dropped":
            case "added_favorite":
            case "moved_from_watching_to_finished":
            case "moved_from_watching_to_dropped":
            case "moved_from_finished_to_watching":
            case "moved_from_finished_to_dropped":
            case "moved_from_dropped_to_watching":
            case "moved_from_dropped_to_finished":
            case "removed_from_favorites":
            case "removed_from_list":
              // For list actions, the targetID is the showID
              enriched.enrichedData = {
                showID: activity.showID || activity.targetID,
              };
              break;

            case "added_to_list":
              // For list actions, targetID is the list ID, showID is the show ID
              const addedList = await List.findById(activity.targetID);
              if (addedList) {
                enriched.enrichedData = {
                  showID: activity.showID,
                  listName: addedList.name,
                  listID: activity.targetID,
                };
              } else {
                enriched.enrichedData = {
                  showID: activity.showID || activity.targetID,
                };
              }
              break;
          }
        } catch (error) {
          console.error(`Error enriching activity ${activity._id}:`, error);
          // Continue without enriched data if there's an error
        }

        return enriched;
      })
    );

    res.json({
      activities: enrichedActivities,
      total: allActivities.length,
    });
  } catch (error) {
    console.error("Error fetching following activity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
