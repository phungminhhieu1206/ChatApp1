import React, { Component } from "react";
import classNames from "classnames";
//import avatar from "../images/avatar.png";
import { OrderedMap } from "immutable";
import _ from "lodash";
import { ObjectID } from "../helpers/objectid";
import SearchUser from "./search-user";
import moment from "moment";
import UserBar from "./UserBar";
class Messenger extends Component {
  constructor(props) {
    super(props);

    this.state = {
      height: window.innerHeight,
      newMessage: "",
      searchUser: "",
      showSearchUser: false,
    };

    this._onResize = this._onResize.bind(this);

    this.handleSend = this.handleSend.bind(this);
    this.renderMessage = this.renderMessage.bind(this);
    this.scrollMessagesToBottom = this.scrollMessagesToBottom.bind(this);
    this._onCreateChannel = this._onCreateChannel.bind(this);
    this.renderChannelTitle = this.renderChannelTitle.bind(this);
    this.renderChannelAvatars = this.renderChannelAvatars.bind(this);
  }

  renderChannelAvatars(channel) {
    const { store } = this.props;
    const members = store.getMembersFromChannel(channel);
    const maxDisplay = 4;
    const total = members.size > maxDisplay ? maxDisplay : members.size;
    const avatars = members.map((member, index) => {
      return index < maxDisplay ? (
        <img key={index} src={_.get(member, "avatar")} alt={_.get(member, "name")} />
      ) : null;
    });
    return (
      <div
        className={classNames("channel-avatars", `channel-avatars-${total}`)}
      >
        {avatars}
      </div>
    );
  }

  renderChannelTitle(channel = null) {
    const { store } = this.props;

    const members = store.getMembersFromChannel(channel);
    const names = [];
    members.forEach((user) => {
      if (!user) return;
      const name = _.get(user, "name");
      names.push(name);
    });
    let title = _.join(names, ",");
    if (!title && _.get(channel, "isNew")) {
      title = "New Message";
    }

    return <h2>{title}</h2>;
  }

  _onCreateChannel() {
    const { store } = this.props;
    const currentUser = store.getCurrentUser();
    const currentUserId = _.get(currentUser, "id");

    const channelId = new ObjectID().toString();
    const channel = {
      _id: channelId,
      title: "New Message",
      lastMessage: "",
      members: new OrderedMap(),
      messages: new OrderedMap(),
      isNew: true,
      userId: currentUserId,
      created: new Date(),
    };
    //channel.members = channel.members.set(currentUserId, true);
    store.onCreateNewChannel(channel);
  }

  scrollMessagesToBottom() {
    if (this.messagesRef) {
      this.messagesRef.scrollTop = this.messagesRef.scrollHeight;
    }
  }

  renderMessage(message) {
    const text = _.get(message, "body", "");

    const html = _.split(text, "\n").map((m, key) => {
      return <p key={key} dangerouslySetInnerHTML={{ __html: m }} />;
    });

    return html;
  }

  handleSend() {
    const { newMessage } = this.state;
    const { store } = this.props;

    if (_.trim(newMessage).length) {
      const messageId = new ObjectID().toString();
      const channel = store.getActiveChannel();
      const channelId = _.get(channel, "_id", null);
      const currentUser = store.getCurrentUser();

      const message = {
        _id: messageId,
        channelId: channelId,
        body: newMessage,
        userId: _.get(currentUser, "id"),
        me: true,
      };

      store.addMessage(messageId, message);

      this.setState({
        newMessage: "",
      });
    }
  }

  _onResize() {
    this.setState({
      height: window.innerHeight,
    });
  }

  componentDidUpdate() {
    this.scrollMessagesToBottom();
  }

  componentDidMount() {
    window.addEventListener("resize", this._onResize);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this._onResize);
  }

  render() {
    const { store } = this.props;
    const { height } = this.state;

    const style = {
      height: height,
    };

    // Gan gia tri !!!
    const activeChannel = store.getActiveChannel();
    const messages = store.getMessagesFromChannel(activeChannel);
    const channels = store.getChannels();
    const members = store.getMembersFromChannel(activeChannel);

    return (
      <div style={style} className="app-messenger">
        <div className="header">
          <div className="left">
            <button className="left-action">
              <i className="icon-settings-streamline-1"></i>
            </button>
            <button onClick={this._onCreateChannel} className="right-action">
              <i className="icon-edit-modify-streamline"></i>
            </button>
            <h2>Messenger</h2>
          </div>
          {/* end-left-header */}

          <div className="content">
            {_.get(activeChannel, "isNew") ? (
              <div className="toolbar">
                <label>To: </label>
                {members.map((user, key) => {
                  if (!user) return null;
                  return (
                    <span
                      onClick={() => {
                        store.removeMemberFromChannel(activeChannel, user);
                      }}
                      key={key}
                    >
                      {_.get(user, "name")}
                    </span>
                  );
                })}
                <input
                  placeholder=" Type name of person..."
                  onChange={(event) => {
                    const searchUserText = _.get(event, "target.value"); // searchUserText = event.target,value

                    this.setState(
                      {
                        searchUser: searchUserText,
                        showSearchUser: true,
                      },
                      () => {
                        store.startSearchUsers(searchUserText);
                      }
                    );
                  }}
                  type="text"
                  value={this.state.searchUser}
                ></input>

                {this.state.showSearchUser ? (
                  <SearchUser
                    onSelect={(user) => {
                      this.setState(
                        {
                          showSearchUser: false,
                          searchUser: "",
                        },
                        () => {
                          const userId = _.get(user, "_id");
                          const channelId = _.get(activeChannel, "_id");

                          store.addUserToChannel(channelId, userId);
                        }
                      );
                    }}
                    store={store}
                  />
                ) : null}
              </div>
            ) : (
              this.renderChannelTitle(activeChannel)
            )}
          </div>

          <div className="right">
            <div className="user-bar">
              <UserBar store={store} />
            </div>
          </div>
        </div>
        {/* End-header */}

        <div className="main">
          <div className="sidebar-left">
            <div className="channels">
              {/* one-channel */}
              {channels.map((channel, key) => {
                return (
                  <div
                    onClick={(key) => {
                      store.setActiveChannelId(channel._id);
                    }}
                    key={channel._id}
                    className={classNames(
                      "channel",
                      { notify: _.get(channel, "notify") === true },
                      {
                        active:
                          _.get(activeChannel, "_id") ===
                          _.get(channel, "_id", null),
                      }
                    )}
                  >
                    <div className="user-image">
                      {this.renderChannelAvatars(channel)}
                    </div>
                    <div className="channel-info">
                      {this.renderChannelTitle(channel)}
                      <p>{channel.lastMessage}</p>
                    </div>
                  </div>
                );
              })}
              {/* end-one-channel */}
            </div>
          </div>
          {/* end-sidebar-left */}

          {/* main-content */}
          <div className="content">
            <div ref={(ref) => (this.messagesRef = ref)} className="messages">
              {/* one-message */}
              {messages.map((message, index) => {
                const user = _.get(message, "user");
                if (!message) return null;
                return (
                  <div
                    key={index}
                    className={classNames("message", { me: message.me })}
                  >
                    <div className="message-user-image">
                      <img src={_.get(user, "avatar")} alt="" />
                    </div>
                    <div className="message-body">
                      <div className="message-author">
                        {message.me ? "You" : _.get(message, "user.name")} says:
                      </div>
                      <div className="message-text">
                        {this.renderMessage(message)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* end-message */}
            </div>
            {/* end-display-chatBox */}

            {activeChannel && members.size > 0 ? (
              <div className="messenger-input">
                <div className="text-input">
                  <textarea
                    onKeyUp={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        this.handleSend();
                      }
                      if (event.key === "shiftKey") {
                      }
                    }}
                    onChange={(event) => {
                      console.log("Text is changing: ", event.target.value);
                      this.setState({
                        newMessage: _.get(event, "target.value"),
                      });
                    }}
                    value={this.state.newMessage}
                    placeholder="Write your message ..."
                  ></textarea>
                </div>
                <div className="actions">
                  <button onClick={this.handleSend} className="send">
                    Send
                  </button>
                </div>
              </div>
            ) : null}
            {/* end-your-input-box */}
          </div>
          {/* end-main-content */}

          <div className="sidebar-right">
            {members.size > 0 ? (
              <div>
                <h2 className="title">Members:</h2>
                <div className="members">
                  {/* one-member */}
                  {members.map((member, key) => {
                    const isOnline = _.get(member, "isOnline", false);
                    if (!member) return null;
                    return (
                      <div key={key} className="member">
                        <div className="user-image">
                          <img src={_.get(member, "avatar")} alt="" />
                          <span
                            className={classNames("user-status", {
                              online: isOnline,
                            })}
                          />
                        </div>
                        <div className="member-info">
                          <h2>
                            {member.name} -{" "}
                            <span
                              className={classNames("user-status", {
                                online: isOnline,
                              })}
                            >
                              {isOnline ? "Online" : "Offline"}
                            </span>
                          </h2>
                          <p>Joined: {moment(member.created).fromNow()}</p>
                        </div>
                      </div>
                    );
                  })}
                  {/* end-one-member */}
                </div>
              </div>
            ) : null}
          </div>
          {/* end-sidebar-right */}
        </div>
        {/* End-main */}
      </div>
    );
  }
}

export default Messenger;
