const mongoose = require("mongoose");

const galleryFolderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  thumbnailUrl: {
    type: String,
    required: true,
  },
  thumbnailPublicId: {
    type: String,
    required: true,
  },
  folderType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("GalleryFolder", galleryFolderSchema);
