import React, { Component } from "react";
import _ from "lodash";

class SearchUser extends Component {
  constructor(props) {
    super(props);

    this.handleOnClick = this.handleOnClick.bind(this);
  }

  handleOnClick(user) {
    // console.log("You selected user is: ", user.name);
    // => day la noi xu ly hanh dong sau khi click user

    if (this.props.onSelect) {
      this.props.onSelect(user);
    }
  }

  render() {
    const { store } = this.props;

    const users = store.getSearchUsers();

    return (
      <div className="search-user">
        <div className="user-list">
          {users &&
            users.map((user, index) => {
              return (
                <div
                  onClick={() => this.handleOnClick(user)}
                  key={index}
                  className="user"
                >
                  <img src={_.get(user, "avatar")} alt="..."></img>
                  <h2>{_.get(user, "name")}</h2>
                </div>
              );
            })}
        </div>
      </div>
    );
  }
}

export default SearchUser;
