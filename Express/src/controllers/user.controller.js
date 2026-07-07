const userService = require('../services/user.service');

exports.findOne = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Felhasználó nem található' });        
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
    try {
      const updatedUser = await userService.updateUser(req.params.id, req.body);
      if (!updatedUser) return res.status(404).json({ message: 'Felhasználó nem található' });
      
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
};

exports.delete = async (req, res) => {
  try {
    const deletedUser = await userService.deleteUser(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'Felhasználó nem található' });
    
    res.status(200).json({ message: 'Felhasználó sikeresen törölve' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};