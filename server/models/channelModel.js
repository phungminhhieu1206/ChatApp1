const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const channelSchema = new Schema({
  title: {
    type: String,
  },
  lastMessage: {
    type: String,
  },
  created: {
    type: Date,
    default: new Date(),
  },
  userId: {
    type: Schema.Types.ObjectId,
  },
  members: [
    {type: Schema.Types.ObjectId,
      ref: 'User'
    }],
  updated:{
    type: Date,
  }
});

module.exports = mongoose.model("Channel", channelSchema);
