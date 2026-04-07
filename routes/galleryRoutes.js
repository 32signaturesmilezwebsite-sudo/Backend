const express = require("express");
const router = express.Router();
const multer = require("multer");
const GalleryFolder = require("../models/GalleryFolder");
const Gallery = require("../models/Gallery");
const { storage, cloudinary } = require("../config/cloudinary");

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for video support
});

// Helper to format video links for embedding
const formatVideoLink = (url) => {
  if (!url) return '';
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : url;
  }
  if (url.includes('drive.google.com')) {
    return url.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
  }
  return url;
};

// 1. Get all folders (Public)
router.get("/folders", async (req, res) => {
  try {
    const folders = await GalleryFolder.find().sort({ createdAt: -1 });
    res.json(folders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching folders" });
  }
});

// 2. Get images by folder (Public)
router.get("/folders/:folderId/images", async (req, res) => {
  try {
    const images = await Gallery.find({ folderId: req.params.folderId }).sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching folder images" });
  }
});

// 2b. Explicitly Create Folder (Admin)
router.post("/folders", upload.single("thumbnail"), async (req, res) => {
  try {
    const { folderName, folderType } = req.body;
    if (!req.file) return res.status(400).json({ message: "Thumbnail is required." });
    
    const existingFolder = await GalleryFolder.findOne({ name: folderName });
    if (existingFolder) return res.status(400).json({ message: "Folder name already exists." });
    
    const newFolder = new GalleryFolder({
      name: folderName,
      thumbnailUrl: req.file.path,
      thumbnailPublicId: req.file.filename,
      folderType: folderType || 'image',
    });
    const savedFolder = await newFolder.save();
    res.status(201).json(savedFolder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating folder." });
  }
});

// 3. Unified Upload (Admin)
router.post(
  "/upload",
  upload.fields([
    { name: "image", maxCount: 1 }, // Used for standard image or video thumbnail
    { name: "video", maxCount: 1 }, // Used for video upload
    { name: "thumbnail", maxCount: 1 }, // Used for new folder creation
  ]),
  async (req, res) => {
    try {
      const { title, description, isNewFolder, folderName, folderId, folderType, mediaType, videoLinkUrl } = req.body;

      let targetFolderId = folderId;

      // Handle New Folder Creation Inline
      if (isNewFolder === "true") {
        if (!req.files || !req.files.thumbnail) {
          return res.status(400).json({ message: "Thumbnail is required when creating a new folder." });
        }
        
        const existingFolder = await GalleryFolder.findOne({ name: folderName });
        if (existingFolder) {
            return res.status(400).json({ message: "Folder name already exists." });
        }

        const thumbnailFile = req.files.thumbnail[0];
        const newFolder = new GalleryFolder({
          name: folderName,
          thumbnailUrl: thumbnailFile.path,
          thumbnailPublicId: thumbnailFile.filename,
          folderType: folderType || 'image',
        });

        const savedFolder = await newFolder.save();
        targetFolderId = savedFolder._id;
      }

      if (!targetFolderId) {
        return res.status(400).json({ message: "Folder selection is required." });
      }

      // Prepare Media Based on mediaType
      const activeMediaType = mediaType || 'image';
      let imageUrl = '';
      let imagePublicId = '';
      let videoUrl = '';
      let videoPublicId = '';
      let formattedVideoLink = '';

      // Image acts as the primary visual display (Standard Image OR Video Thumbnail)
      if (req.files && req.files.image) {
        imageUrl = req.files.image[0].path;
        imagePublicId = req.files.image[0].filename;
      }

      if (activeMediaType === 'image' && !imageUrl) {
        return res.status(400).json({ message: "Image file is required for image galleries." });
      }

      if (activeMediaType === 'video-upload') {
        if (!req.files || !req.files.video) {
          return res.status(400).json({ message: "Video file is required for video uploads." });
        }
        videoUrl = req.files.video[0].path;
        videoPublicId = req.files.video[0].filename;
      }

      if (activeMediaType === 'video-link') {
        if (!videoLinkUrl) {
          return res.status(400).json({ message: "Video Link URL is required." });
        }
        formattedVideoLink = formatVideoLink(videoLinkUrl);
      }

      const newGalleryMedia = new Gallery({
        title,
        description: description || "",
        folderId: targetFolderId,
        mediaType: activeMediaType,
        imageUrl,
        publicId: imagePublicId,
        videoUrl,
        videoPublicId,
        videoLinkUrl: formattedVideoLink,
      });

      const savedMedia = await newGalleryMedia.save();
      res.status(201).json({ image: savedMedia, folderId: targetFolderId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error during upload" });
    }
  }
);

// 4. Delete a folder and ALL its images (Admin)
router.delete("/folder/:id", async (req, res) => {
  try {
    const folderId = req.params.id;
    const folder = await GalleryFolder.findById(folderId);
    
    if (!folder) return res.status(404).json({ message: "Folder not found" });

    // Find and delete all images physically
    const images = await Gallery.find({ folderId });
    for (const img of images) {
      if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
    }
    
    // Delete folder thumbnail
    if (folder.thumbnailPublicId) await cloudinary.uploader.destroy(folder.thumbnailPublicId);

    // Delete DB entries
    await Gallery.deleteMany({ folderId });
    await GalleryFolder.findByIdAndDelete(folderId);

    res.json({ message: "Folder and contents deleted successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error deleting folder." });
  }
});

// 5. Delete a single image (Admin)
router.delete("/image/:id", async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);
    if (!image) return res.status(404).json({ message: "Image not found" });

    if (image.publicId) await cloudinary.uploader.destroy(image.publicId);
    await Gallery.findByIdAndDelete(req.params.id);

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error deleting image" });
  }
});

module.exports = router;
