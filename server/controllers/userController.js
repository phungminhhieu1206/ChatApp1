const jwtDecode = require("jwt-decode");
const User = require("../models/userModel");
const Channel = require("../models/channelModel");
const ObjectId = require("mongodb").ObjectID;

module.exports.createChannel = async (req, res) => {
  try {
    const newChannel = new Channel(req.body);
    const members = Object.keys(req.body.members);
    await delete newChannel.members;
    newChannel.members = members;
    await newChannel.save();
    return res.status(200).json(newChannel);
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};

module.exports.findById = async (req, res) => {
  try {
    const userId = req.params.userId;
    let user = await User.findById(userId);
    delete user.password;
    res.status(200).json(user);
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};

module.exports.findUserInArray = async (req, res) => {
  try {
    const query = {
      _id: { $in: req.body.members },
    };
    const queryOptions = {
      _id: 1,
      name: 1,
      created: 1,
    };
    const users = await User.find(query, queryOptions);
    return res.status(200).json(users);
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};

module.exports.search = async (req, res) => {
  try {
    keyword = req.body.search;
    const regex = new RegExp(keyword, "i");
    const query = {
      $or: [{ name: { $regex: regex } }, { email: { $regex: regex } }],
    };

    const users = await User.find(query, {
      _id: true,
      name: true,
    });
    return res.status(200).json(users);
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};

module.exports.fetchMyChannels = async (req, res) => {
  try {
    let token = req.body.token;
    const data = jwtDecode(token);
    const userId = data.userId;
    const query = [
      {
        $match: {
          members: ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "users",
        },
      },

      {
        $project: {
          _id: true,
          title: true,
          lastMessage: true,
          created: true,
          updated: true,
          userId: true,
          users: {
            _id: true,
            name: true,
            created: true,
            isOnline: true
          },
          members: true,
        },
      },
      {
        $sort: {
          updated: -1,
          created: -1,
        },
      },
      {
        $limit: 50,
      },
    ];

    let channels = await Channel.aggregate(query);
    return res.status(200).json(channels);
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};

module.exports.updateUserStatus = async (req, res) => {
  try {
    const userId = req.body.userId;
    const user = await User.findByIdAndUpdate(userId, {
      isOnline: req.body.isOnline,
    });
    return res.status(200).json(user);
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};
