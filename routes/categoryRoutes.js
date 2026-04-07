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

// DELETE category (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting category' });
  }
});

module.exports = router;
