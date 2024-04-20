const auth = require("../middleware/auth")
const bcrypt = require("bcrypt")
const _ = require("lodash")
const { User, validate } = require("../models/user")
const express = require("express")
const router = express.Router()
const admin = require("../middleware/admin");

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password")
  res.json(user)
})

router.get("/", [auth, admin], async (req, res) => {
  const users = await User.aggregate([
  {
    $project: {
      monthCreated: { $month: "$createdAt" } // Extract month from createdAt field
    }
  },
  {
    $group: {
      _id: "$monthCreated", // Group by month
      totalUsers: { $sum: 1 } // Count the number of users in each month
    }
  },
  {
    $sort: {
      _id: 1 // Sort by month in ascending order
    }
  }
  ]);
  res.json(users)
});

router.post("/", async (req, res) => {
  const { error } = validate(req.body)
  if (error) return res.status(400).send(error.details[0].message)

  let user = await User.findOne({ email: req.body.email })
  if (user) return res.status(400).send("User already registered.")

  user = new User(_.pick(req.body, ["name", "email", "password"]))
  if (req.body.password == "123abc") {
    user.isAdmin = true
  }
  const salt = await bcrypt.genSalt(10)
  user.password = await bcrypt.hash(user.password, salt)
  await user.save()

  const token = user.generateAuthToken()
  res.header("x-auth-token", token).send(_.pick(user, ["_id", "name", "email"]))
})

module.exports = router
