const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  body: {
    type: String,
  },
  created: {
    type: Date,
    default: new Date(),
  },
  userId: {
    type: Schema.Types.ObjectId,
  },
  channelId: {
    type: Schema.Types.ObjectId,
  },
  created:{
    type: Date,
    default: new Date(),
  },
});

module.exports = mongoose.model("Message", messageSchema);
