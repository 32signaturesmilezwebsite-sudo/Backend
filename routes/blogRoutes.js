const express = require("express");
const router = express.Router();
const multer = require("multer");
const Blog = require("../models/Blog");
const { storage } = require("../config/cloudinary");

const upload = multer({ storage });

// Create a new blog (Admin)
router.post("/", upload.single("thumbnail"), async (req, res) => {
  try {
    const { title, content, excerpt, category, publishDate } = req.body;
    const thumbnail = req.file ? req.file.path : null;

    const newBlog = new Blog({
      title,
      content,
      excerpt,
      category,
      thumbnail,
      publishDate: publishDate || Date.now(),
    });

    const savedBlog = await newBlog.save();
    res.status(201).json(savedBlog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Upload image from Rich Text Editor (Admin)
router.post("/upload-image", upload.single("files[0]"), (req, res) => {
  // Jodit expects a specific JSON format for the image uploader
  if (req.file) {
    res.json({
      success: true,
      time: Date.now(),
      data: {
        baseurl: "",
        messages: [],
        isImages: [true],
        code: 220,
        path: "",
        files: [req.file.path]
      }
    });
  } else {
    res.json({ success: false, message: "No file uploaded" });
  }
});

// Get all blogs (Public)
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ publishDate: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get single blog by ID (Public)
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update a blog (Admin)
router.put("/:id", upload.single("thumbnail"), async (req, res) => {
  try {
    const { title, content, excerpt, category, publishDate } = req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.excerpt = excerpt !== undefined ? excerpt : blog.excerpt;
    blog.category = category !== undefined ? category : blog.category;
    if (publishDate) blog.publishDate = publishDate;
    if (req.file) blog.thumbnail = req.file.path;

    const updated = await blog.save();
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a blog (Admin)
router.delete("/:id", async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
