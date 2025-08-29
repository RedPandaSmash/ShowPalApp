import { Schema, model } from 'mongoose';

// Reply model: comment required, userID ref to User, likes, likedBy
// parentID uses refPath to allow referencing either a Review or another Reply
const replySchema = new Schema({
  parentID: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'parentModel',
  },
  parentModel: {
    type: String,
    required: true,
    enum: ['Review', 'Reply'],
  },
  userID: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  comment: {
    type: String,
    required: true,
    maxlength: 500,
  },
  likes: {
    type: Number,
    default: 0,
  },
  likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default model('Reply', replySchema);
