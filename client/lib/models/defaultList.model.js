import { Schema, model } from "mongoose";

const defaultListSchema = new Schema(
  {
    userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listType: {
      type: String,
      required: true,
      enum: ["Watching", "Finished", "Dropped", "Favorites"],
      immutable: true, // prevents changing the list type after creation
    },
    shows: [{ type: String }],
  },
  { timestamps: true, createdAt: "created_at", updatedAt: "updated_at" }
);

// Compound index to ensure one list of each type per user
defaultListSchema.index({ userID: 1, listType: 1 }, { unique: true });

// Static method to create all default lists for a user
defaultListSchema.statics.createDefaultListsForUser = async function (userID) {
  const listTypes = ["Watching", "Finished", "Dropped", "Favorites"];
  const defaultLists = [];

  for (const listType of listTypes) {
    try {
      const list = new this({
        userID,
        listType,
        shows: [],
      });
      const savedList = await list.save();
      defaultLists.push(savedList);
    } catch (error) {
      // Skip if list already exists (duplicate key error)
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  return defaultLists;
};

// Instance method to move show between status lists (Watching, Finished, Dropped)
defaultListSchema.statics.moveShowBetweenStatusLists = async function (
  userID,
  showID,
  fromListType,
  toListType
) {
  const statusLists = ["Watching", "Finished", "Dropped"];

  if (
    !statusLists.includes(fromListType) ||
    !statusLists.includes(toListType)
  ) {
    throw new Error(
      "Can only move shows between Watching, Finished, and Dropped lists"
    );
  }

  // Remove from source list
  await this.updateOne(
    { userID, listType: fromListType },
    { $pull: { shows: showID } }
  );

  // Add to destination list (only if not already there)
  await this.updateOne(
    { userID, listType: toListType },
    { $addToSet: { shows: showID } }
  );

  // Track activity in user's profile
  try {
    const Profile = (await import("./profile.model.js")).default;
    let actionType = "";
    if (fromListType === "Watching" && toListType === "Finished") {
      actionType = "moved_from_watching_to_finished";
    } else if (fromListType === "Watching" && toListType === "Dropped") {
      actionType = "moved_from_watching_to_dropped";
    } else if (fromListType === "Finished" && toListType === "Watching") {
      actionType = "moved_from_finished_to_watching";
    } else if (fromListType === "Finished" && toListType === "Dropped") {
      actionType = "moved_from_finished_to_dropped";
    } else if (fromListType === "Dropped" && toListType === "Watching") {
      actionType = "moved_from_dropped_to_watching";
    } else if (fromListType === "Dropped" && toListType === "Finished") {
      actionType = "moved_from_dropped_to_finished";
    }

    if (actionType) {
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
              details: `Moved show ${showID} from ${fromListType} to ${toListType}`,
            },
          },
        }
      );
    }
  } catch (profileError) {
    console.error("Error adding move activity to profile:", profileError);
  }
};

export default model("DefaultList", defaultListSchema);