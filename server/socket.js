const { OrderedMap } = require("immutable");
const _ = require("lodash");
const axios = require("axios");

module.exports = (io) => {
  let userId = null;
  let userName = null;
  let connections = new OrderedMap();
  io.on("connect", (socket) => {
    socket.on("getUser", async (user) => {
      userId = user._id;
      io.sockets.emit("user_online", userId);
      await axios.post("http://localhost:8081/user/updateUserStatus", {
        userId: userId,
        isOnline: true,
      });
      userName = user.name;
    });
    console.log(`${userName} has connected`);
    const clientConnection = {
      _id: socket.id,
      ws: socket,
      userId: userId,
    };
    // save to cache
    if (clientConnection) {
      connections = connections.set(socket.id, clientConnection);
      console.log(clientConnection.userId, "userId");
    }

    socket.on("create_channel", async (msg) => {
      try {
        const res = await axios.post(
          "http://localhost:8081/user/createChannel",
          msg
        );
        const channel = res.data;
        const members = Object.keys(msg.members);
        // send back to all user in new channel
        const users = await axios.post(
          "http://localhost:8081/user/findUserInArray",
          { members }
        );
        channel.users = users.data;
        _.each(members, (id) => {
          const memberConnection = connections.filter(
            (connect) => `${connect.userId}` === `${id}`
          );
          if (memberConnection.size) {
            memberConnection.forEach((connect) => {
              const socketId = connect._id;
              socket.to(socketId).emit("channel_added", channel);
            });
          }
        });
      } catch (err) {
        console.log(err + " ");
      }
    });

    socket.on("create_message", async (msg) => {
      try {
        await axios.post("http://localhost:8081/channel/saveMessage", msg);
        const res = await axios.post("http://localhost:8081/channel/findById", {
          channelId: msg.channelId,
        });
        const members = res.data.members;
        _.each(members, (id) => {
          const memberConnection = connections.filter(
            (connect) => `${connect.userId}` === `${id}`
          );
          //console.log(memberConnection)
          if (memberConnection.size) {
            memberConnection.forEach((connect) => {
              const socketId = connect._id;
              socket.to(socketId).emit("message_added", msg);
            });
          }
        });
      } catch (err) {
        console.log(err + " ");
      }
    });

    socket.on("disconnect", async () => {
      const closeConnection = connections.get(socket.id);
      const userId = _.get(closeConnection, "userId", null);
      // remove this socket client from the cache collection.
      connections = connections.remove(socket.id);
      console.log(`${userName} disconnected`);
      if (userId) {
        // now find all socket clients matching with userId
        const userConnections = connections.filter(
          (connect) => _.get(connect, "userId") === userId
        );
        if (userConnections.size === 0) {
          // this mean no more socket clients is online with this userId. now user is offline.
          io.sockets.emit("user_offline", userId);
          await axios.post("http://localhost:8081/user/updateUserStatus", {
            userId: userId,
            isOnline: false,
          });
        }
      }
    });
  });
};
