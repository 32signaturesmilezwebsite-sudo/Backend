const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    thumbnail: { type: String }, // Path to uploaded image
    content: { type: String, required: true }, // HTML from Jodit
    excerpt: { type: String },
    category: { type: String, required: true },
    publishDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", blogSchema);
