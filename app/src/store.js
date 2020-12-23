import { OrderedMap } from "immutable";
import _ from "lodash";
import Service from "./service";
import jwt_decode from "jwt-decode";
import RealTime from "./socket";
import avatar from "./images/avatar.png"
export default class Store {
  constructor(appComponent) {
    this.app = appComponent;
    this.service = new Service();
    this.messages = new OrderedMap();
    this.channels = new OrderedMap();
    this.activeChannelId = null;

    this.token = this.getTokenFromLocalStorage();

    this.user = this.getUserFromLocalStorage();
    this.users = new OrderedMap();

    this.search = {
      users: new OrderedMap(),
    };

    this.realtime = new RealTime(this);
    this.fetchUserChannels();
  }

  addChannel(index, channel = {}) {
    this.channels = this.channels.set(`${index}`, channel);
    this.update();
  }

  addMessage(id, message = {}) {
    const user = this.getCurrentUser();
    message.user = user;
    this.messages = this.messages.set(id, message);

    // let's add new messageId to current channel -> message

    const channelId = _.get(message, "channelId");
    if (channelId) {
      let channel = this.channels.get(channelId);

      channel.lastMessage = _.get(message, "body", "");
      channel.userId = user._id;
      // now send channel info to server
      const channelObj = {
        action: "create_channel",
        payload: channel,
      };
      this.realtime.send(channelObj);

      const messageObj = {
        action: "create_message",
        payload: message,
      };
      this.realtime.send(messageObj);

      channel.messages = channel.messages.set(id, true);
      channel.isNew = false;

      this.channels = this.channels.set(channelId, channel);
    }
    this.update();
  }

  addUserToCache(user) {
    user.avatar = this.loadUserAvatar(user);
    this.users = this.users.set(user._id, user);
    this.update();
    return user;
  }

  addUserToChannel(channelId, userId) {
    // console.log("Adding new user to channel: ", channelId, "with user: ", userId);
    const channel = this.channels.get(channelId);

    if (channel) {
      // now add this user id to channel members
      channel.members = channel.members.set(userId, true);
      this.channels = this.channels.set(channelId, channel);
      this.update();
    }
  }

  clearCacheData() {
    this.channels = this.channels.clear();
    this.users = this.users.clear();
    this.messages = this.messages.clear();
  }

  async fetchUserChannels() {
    try {
      const userToken = this.getUserToken();
      if (userToken) {
        const res = await this.service.post("user/me/channels", {
          token: userToken,
        });
        const channels = res.data;
        _.each(channels, (channel) => {
          this.realtime.onAddChannel(channel);
        });
        const firstChannelId = _.get(channels, "[0]._id", null);
        this.fetchChannelMessages(firstChannelId);
      }
    } catch (err) {
      console.log(err + " ");
    }
  }

  async fetchChannelMessages(channelId) {
    try {
      let channel = this.channels.get(channelId);
      if (channel && !_.get(channel, "isFetchedMessages")) {
        const res = await this.service.get(`channel/${channelId}/messages`);
        channel.isFetchedMessages = true;
        const messages = res.data;
        _.each(messages, (message) => {
          this.realtime.onAddMessage(message);
        });

        this.channels = this.channels.set(channelId, channel);
      }
    } catch (err) {
      console.log(err + " ");
      return err;
    }
  }

  getCurrentUser() {
    return this.user;
  }

  getActiveChannel() {
    const channel = this.activeChannelId
      ? this.channels.get(this.activeChannelId)
      : this.channels.first();
    return channel;
  }

  getMessages() {
    return this.messages.valueSeq();
  }

  getMessagesFromChannel(channel) {
    let messages = new OrderedMap();

    if (channel && channel.messages) {
      channel.messages.forEach((value, key) => {
        const message = this.messages.get(key);
        messages = messages.set(key, message);
      });
    }

    return messages.valueSeq();
  }

  getMembersFromChannel(channel) {
    let members = new OrderedMap();

    if (channel && channel.members) {
      channel.members.forEach((value, key) => {
        const user = this.users.get(`${key}`);
        const loggedUser = this.getCurrentUser();
        if (_.get(loggedUser, "_id") !== _.get(user, "_id")) {
          members = members.set(key, user);
        }
      });
    }

    return members.valueSeq();
  }

  getChannels() {
    // we need to sort channel by date, the last one will list on top
    this.channels = this.channels.sort((a, b) => a.updated < b.updated);

    return this.channels.valueSeq();
  }

  getUserFromLocalStorage() {
    if (this.token) {
      const user = jwt_decode(this.token).user;
      this.setCurrentUser(user);
      return user;
    }
  }

  getTokenFromLocalStorage() {
    return localStorage.getItem("token");
  }

  getSearchUsers() {
    return this.search.users.valueSeq();
  }

  getUserToken() {
    if (this.token) {
      return this.token;
    }
  }

  loadUserAvatar(user) {
    // return `https://api.adorable.io/avatars/285/${user._id}.png`;
    return avatar;
  }

  async login(email = null, password = null) {
    //try {
      const userEmail = _.toLower(email);
      const user = {
        email: userEmail,
        password: password,
      };
      const res = await this.service.post("login", user);
      const data = jwt_decode(res.data.token);
      const curUser = _.get(data, "user");
      if (curUser) {
        this.setCurrentUser(curUser);
      }
      this.setUserToken(res.data.token);
      this.realtime.connect();
      this.fetchUserChannels();
    //} catch (err) {
      //console.log(err+" ");
    //}
  }

  logout() {
    const userId = `${_.get(this.user, "_id")}`;
    this.user = null;
    localStorage.removeItem("token");
    this.clearCacheData();
    if (userId) {
      this.users = this.users.remove(userId);
    }
    this.update();
  }
  onCreateNewChannel(channel = {}) {
    channel.members = channel.members.set(this.user._id, true);
    const channelId = _.get(channel, "_id");
    this.addChannel(channelId, channel);
    this.setActiveChannelId(channelId);
  }

  removeMemberFromChannel(channel = null, user = null) {
    if (!channel || !user) {
      return;
    }
    const userId = _.get(user, "_id");
    const channelId = _.get(channel, "_id");
    channel.members = channel.members.remove(userId);
    this.channels = this.channels.set(channelId, channel);
    this.update();
  }

  async register(user) {
    await this.service.post("register", user);
  }

  setActiveChannelId(id) {
    this.activeChannelId = id;
    this.fetchChannelMessages(id);
    this.update();
  }

  async startSearchUsers(q = "") {
    try {
      const data = { search: q };
      this.search.users = this.search.users.clear();
      const res = await this.service.post("user/search", data);
      const loggedUser = this.getCurrentUser();
      const users = res.data;
      _.each(users, (user) => {
        user.avatar = this.loadUserAvatar(user);
        console.log(user);
        const userId = `${user._id}`;
        // cache to this.users
        this.users = this.users.set(userId, user);
        // add user to this.search.users
        if (_.get(loggedUser, "_id") !== _.get(user, "_id")) {
          this.search.users = this.search.users.set(userId, user);
        }
      });
      this.update();
    } catch (err) {
      return err;
    }
  }

  async setMessage(message, notify = false) {
    try {
      this.messages = this.messages.set(message._id, message);
      const channelId = message.channelId;
      const channel = this.channels.get(channelId);
      if (channel) {
        channel.messages = channel.messages.set(message._id, true);
        channel.lastMessage = message.body;
        channel.notify = notify;
        this.channels = this.channels.set(channelId, channel);
      } else {
        // fetch to the server with channel info
        console.log("fetch to server");
        const res = await this.service.get(`channel/${channelId}`);
        let channel = res.data._doc;
        channel.users = res.data.users;
        this.realtime.onAddChannel(channel);
      }
      this.update();
    } catch (err) {
      return err;
    }
  }

  setCurrentUser(user) {
    user.avatar = this.loadUserAvatar(user);
    this.user = user;
    if (user) {
      localStorage.setItem("me", user);
      const userId = `${user._id}`;
      if (this.users) {
        this.users = this.users.set(userId, user);
      }
    }
    this.update();
  }

  setUserToken(token) {
    if (!token) {
      localStorage.removeItem("token");
      this.token = null;
      return;
    }
    this.token = token;
    localStorage.setItem("token", token);
  }

  // update
  update() {
    this.app.forceUpdate();
  }
}
