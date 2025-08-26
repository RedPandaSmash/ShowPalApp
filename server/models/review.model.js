import { Schema, model } from "mongoose";

const reviewSchema = new Schema({
  showID: {
    type: "string",
    ref: "Show",
    required: true,
  },
  userID: {
    type: "string",
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
});

export default model("Review", reviewSchema);
