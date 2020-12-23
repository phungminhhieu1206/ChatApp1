import io from "socket.io-client";
import jwt_decode from "jwt-decode";
import { OrderedMap } from "immutable";

export default class RealTime {
  constructor(store) {
    this.store = store;
    this.isConnected = false;
    this.socket = null;
    this.connect();
  }

  connect() {
    this.socket = io("http://localhost:8081");
    console.log("connect");
    // let tell server who you are
    this.isConnected = true;
    const token = this.store.getTokenFromLocalStorage();
    if (token) {
      const user = jwt_decode(token).user;
      const obj = {
        action: "getUser",
        payload: user,
      };
      this.send(obj);
    }

    this.socket.on("user_online", (data) => {
      this.onUpdateUserStatus(data, true);
    });

    this.socket.on("user_offline", (data) => {
      this.onUpdateUserStatus(data, false);
    });

    this.socket.on("channel_added", (data) => {
      this.onAddChannel(data);
    });

    this.socket.on("message_added", (data) => {
      const activeChannel = this.store.getActiveChannel();
      const currentUser = this.store.getCurrentUser();
      const currentUserId = currentUser._id;
      let notify =
        activeChannel._id !== data.channelId && currentUserId !== data.userId;
      this.onAddMessage(data, notify);
    });
  }

  send(msg = {}) {
    const isConnected = this.isConnected;

    if (this.socket && isConnected) {
      this.socket.emit(msg.action, msg.payload);
    }
  }

  onUpdateUserStatus(userId, isOnline = false) {
    this.store.users = this.store.users.update(userId, (user) => {
      if (user) {
        user.isOnline = isOnline;
      }
      return user;
    });
    this.store.update();
  }

  onAddMessage(data, notify = false) {
    console.log(data, "message added");
    const currentUser = this.store.getCurrentUser();
    const user = this.store.addUserToCache(data.user);
    const message = {
      _id: data._id,
      body: data.body,
      userId: data.user._id,
      channelId: data.channelId,
      created: data.created,
      me: currentUser._id === data.userId,
      user: user,
    };
    this.store.setMessage(message, notify);
  }

  onAddChannel(data) {
    const store = this.store;
    const users = data.users;
    console.log(users, "users-onAddChannel-realtime");
    let channel = {
      _id: data._id,
      title: data.title,
      lastMessage: data.lastMessage,
      members: new OrderedMap(),
      messages: new OrderedMap(),
      isNew: false,
      userId: data.userId,
      created: new Date(),
    };
    users.forEach((user) => {
      // add this user to store.users
      this.store.addUserToCache(user);
      channel.members = channel.members.set(user._id, true);
    });
    const channelMessages = store.messages.filter(
      (message) => message.channelId === data._id
    );
    channelMessages.forEach((message) => {
      const messageId = message._id;
      channel.messages = channel.messages.set(messageId, true);
    });

    store.addChannel(channel._id, channel);
  }
}
