const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// GET all categories (Public)
router.get('/', async (req, res) => {
  try {
    const cats = await Category.find().sort({ name: 1 });
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching categories' });
  }
});

// POST create category (Admin)
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Category name is required.' });

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) return res.status(409).json({ message: 'Category already exists.' });

    const cat = new Category({ name: name.trim() });
    const saved = await cat.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating category' });
  }
});

// PUT update category (Admin)
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Category name is required.' });

    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });

    const newName = name.trim();
    // Check if another category already has this name
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${newName}$`, 'i') }, _id: { $ne: req.params.id } });
    if (existing) return res.status(409).json({ message: 'Category name already exists' });

    const oldName = cat.name;
    cat.name = newName;
    const saved = await cat.save();

    // Cascade name update to all blogs using this category
    const Blog = require('../models/Blog');
    await Blog.updateMany({ category: oldName }, { category: saved.name });

    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating category' });
  }
});

// DELETE category (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const replaceWith = req.query.replaceWith;
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });

    const Blog = require('../models/Blog');
    const blogCount = await Blog.countDocuments({ category: cat.name });

    if (blogCount > 0) {
      if (!replaceWith) {
        return res.status(400).json({ message: 'This category is used by existing blogs. Please re-assign them before deleting.' });
      }
      
      // Update those blogs
      await Blog.updateMany({ category: cat.name }, { category: replaceWith });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting category' });
  }
});

module.exports = router;
