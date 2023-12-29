const mongoose = require("mongoose")

module.exports = function (req, res, next) {
  console.log("i am used here")
  if (req.params.id) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(404).send("Invalid ID.")
  } else {
    next()
  }
  next()
}
