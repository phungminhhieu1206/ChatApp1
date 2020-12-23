const User = require("../models/userModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const emailExists = await User.findOne({ email: email });
    if (emailExists) {
      return res.status(400).json({ email: "Email is exists" });
    }
    // save user
    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(password, salt);
    let newUser = new User({
      name: name,
      email: email,
      password: hash,
    });
    await newUser.save();
    newUser.password = undefined;
    return res.status(201).json({ newUser });
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};

module.exports.login = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ email: "Email not found" });
    }
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ email: "Password is wrong" });
    }
    const payload = {
      userId: user._id,
      created: new Date(),
      user: user,
    };

    const token = await jwt.sign(payload, "secret", { expiresIn: "24h" });
    res.json({token: token });
  } catch (err) {
    console.log(err + " ");
    return res.status(400).json(err + " ");
  }
};
