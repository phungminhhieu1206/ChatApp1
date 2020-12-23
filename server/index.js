const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const logger = require("morgan"); 
const cors = require("cors"); 
const mongoose = require("mongoose");

const PORT = 8081;
const app = express();

const authRoute = require("./routers/authRoute");
const channelRoute = require("./routers/channelRoute");
const userRoute = require("./routers/userRoute");

//connect database
const db = "mongodb://localhost:27017/chat";
mongoose.connect(
  db,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err) => {
    if (err) {
      console.log("Error in DB connection: " + err);
    } else {
      console.log("MongoDB Connection Succeeded.");
    }
  }
);

// Middleware
app.use(
  bodyParser.json({
    limit: "50mb",
  })
);
app.use(logger("dev"));
app.use(
  cors({
    exposedHeaders: "*",
  })
);

// Router
app.use("/", authRoute);
app.use("/channel", channelRoute);
app.use("/user", userRoute);

// config socket
const server = http.createServer(app);
const io = require("socket.io")(server);
require("./socket")(io);

//Start server
server.listen(process.env.PORT || PORT, () => {
  console.log(`Server is running on port ${server.address().port}`);
});
