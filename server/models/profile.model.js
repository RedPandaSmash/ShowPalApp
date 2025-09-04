import { schema, model } from "mongoose";

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
    type: Number,
    default: 0, // in minutes
  },
  history: [
    {
      showID: String,
    },
  ],
  favorites: [
    {
      showID: String,
    },
  ],
  followers: {
    type: Number,
    default: 0,
  },
  following: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

export default model("Profile", profileSchema);
