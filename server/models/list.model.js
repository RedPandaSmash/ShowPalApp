import { Schema, model } from "mongoose";

const listSchema = new Schema(
  {
    userID: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
  shows: [{ type: String }],
  },
  { timestamps: true, createdAt: "created_at", updatedAt: "updated_at" }
);

export default model("List", listSchema);
