import { Schema, model } from "mongoose";

const reviewSchema = new Schema(
  {
    showID: {
      type: String,
      required: true,
    },
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      maxlength: 500,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true, createdAt: "created_at", updatedAt: "updated_at" }
);

export default model("Review", reviewSchema);
