const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GalleryFolder",
    required: true,
  },
  mediaType: {
    type: String,
    enum: ['image', 'video-upload', 'video-link'],
    default: 'image'
  },
  imageUrl: {
    type: String,
  },
  publicId: {
    type: String,
  },
  videoUrl: {
    type: String,
  },
  videoPublicId: {
    type: String,
  },
  videoLinkUrl: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Gallery", gallerySchema);
