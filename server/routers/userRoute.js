const express = require("express");
const router = express.Router();

const controller = require("../controllers/userController");

router.route("/search").post(controller.search);

router.route("/createChannel").post(controller.createChannel);

router.route("/findUserInArray").post(controller.findUserInArray);

router.route("/me/channels").post(controller.fetchMyChannels);

router.route("/updateUserStatus").post(controller.updateUserStatus);

module.exports = router;

