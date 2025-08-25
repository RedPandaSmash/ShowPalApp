import { Schema, model } from "mongoose";

const reviewSchema = new Schema({
  showID: {
    type: Schema.Types.ObjectId,
    ref: "Show",
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
});

export default model("Review", reviewSchema);
