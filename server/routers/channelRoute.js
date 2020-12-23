const express = require("express");
const router = express.Router();

const controller = require("../controllers/channelController");

router.route("/saveMessage").post(controller.saveMessage);

router.route("/findById").post(controller.findById);

router.route("/:channelId").get(controller.fetchChannel);

router.route("/:channelId/messages").get(controller.fetchChannelMessages);

module.exports = router;

