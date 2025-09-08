import { Schema, model } from "mongoose";

const profileSchema = new Schema({
  userID: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bio: {
    type: String,
    maxlength: 500,
    default: "",
  },
  watchStats: {
    watching: {
      type: Number,
      default: 0, // shows currently watching
    },
    finished: {
      type: Number,
      default: 0, // shows completed
    },
    dropped: {
      type: Number,
      default: 0, // shows dropped
    },
    totalWatchTime: {
      type: Number,
      default: 0, // in minutes
    },
  },
  history: [
    {
      action: {
        type: String,
        required: true,
        enum: [
          "liked_review",
          "liked_reply",
          "left_review",
          "left_reply",
          "added_favorite",
          "created_list",
          "added_to_watching",
          "added_to_finished",
          "added_to_dropped",
          "moved_from_watching_to_finished",
          "moved_from_watching_to_dropped",
          "moved_from_finished_to_watching",
          "moved_from_finished_to_dropped",
          "moved_from_dropped_to_watching",
          "moved_from_dropped_to_finished",
          "removed_from_favorites",
          "removed_from_list",
          "added_to_list",
        ],
      },
      targetType: {
        type: String,
        required: true,
        enum: ["show", "review", "reply", "list"],
      },
      targetID: {
        type: String,
        required: true,
      },
      showID: String, // for show-related activities
      timestamp: {
        type: Date,
        default: Date.now,
      },
      details: String, // optional additional context
    },
  ],
  favorites: [
    {
      showID: String,
    },
  ],
  followers: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

export default model("Profile", profileSchema);
