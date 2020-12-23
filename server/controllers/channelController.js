const User = require("../models/userModel");
const Message = require("../models/messageModel");
const Channel = require("../models/channelModel");
const ObjectId = require('mongodb').ObjectID;


module.exports.saveMessage = async (req, res) => {
  try {
    const newMessage = new Message({
      userId: req.body.user._id,
      body: req.body.body,
      channelId: req.body.channelId,
      created: new Date(),
      me: req.body.me,
    });
    await Channel.findByIdAndUpdate(
      { _id: newMessage.channelId },
      {
        $set: {
          lastMessage: newMessage.body,
          updated: new Date(),
        },
      }
    );
    await newMessage.save();
    return res.status(200).json({
      status: "success",
      message: newMessage,
    });
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};

module.exports.findById = async (req, res) => {
  try {
    const channel = await Channel.findOne({ _id: req.body.channelId });
    return res.status(200).json(channel);
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};

module.exports.fetchChannel = async (req, res) => {
  try {
    let channel = await Channel.findOne({ _id: req.params.channelId });
    const members = channel.members;
    const query = {
      _id: { $in: members },
    };
    const options = {
      _id: true,
      name: true,
      created: true,
      email: true,
    };
    const users = await User.find(query, options);
    channel = { ...channel, users: users };
    return res.status(200).json(channel);
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};

module.exports.fetchChannelMessages = async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const query = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $match: {
          channelId: ObjectId(channelId)
        },
      },
      {
        $project: {
          _id: true,
          channelId: true,
          userId: true,
          body: true,
          created: true,
          user: {
            _id: true,
            name: true,
            created: true,
            isOnline: true,
          },
        },
      },
      {
        $limit: 50,
      },
      {
        $skip: 0,
      },
      {
        $sort: { created: 1 },
      },
    ];
    let messages = await Message.aggregate(query);
    messages.forEach((message) => {
      const temp = message.user[0]
      delete message.user
      message.user = temp;
    })
    return res.status(200).json(messages);
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};
