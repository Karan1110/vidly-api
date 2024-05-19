const mongoose = require("mongoose");
const { movieSchema } = require("./movie");

const ListSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true },
    type: { type: String },
    genre: { type: String },
    content: { type: [movieSchema] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("List", ListSchema);
