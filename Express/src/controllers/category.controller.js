const categoryService = require('../services/category.service');

exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const categories = await categoryService.getCategoriesByUserId(userId);
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Hiba a kategóriák lekérdezésekor', error: error.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;
    const category = await categoryService.getCategoryById(categoryId, userId);
    
    if (!category) {
      return res.status(404).json({ message: 'Kategória nem található' });
    }
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Hiba a kategória lekérdezésekor', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryData = { ...req.body, userId };
    
    const newCategory = await categoryService.createCategory(categoryData);
    res.status(201).json(newCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Már létezik kategória ezzel a névvel!' });
    }
    res.status(500).json({ message: 'Hiba a kategória létrehozásakor', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;
    const updateData = req.body;
    
    const updatedCategory = await categoryService.updateCategory(categoryId, userId, updateData);
    
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Kategória nem található vagy nincs jogosultságod módosítani' });
    }
    res.status(200).json(updatedCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Már létezik kategória ezzel a névvel!' });
    }
    res.status(500).json({ message: 'Hiba a kategória frissítésekor', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const userId = req.user.id;
    const categoryId = req.params.id;
    
    const deletedCategory = await categoryService.deleteCategory(categoryId, userId);
    
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Kategória nem található vagy nincs jogosultságod törölni' });
    }
    res.status(200).json({ message: 'Kategória sikeresen törölve', id: categoryId });
  } catch (error) {
    res.status(500).json({ message: 'Hiba a kategória törlésekor', error: error.message });
  }
};
