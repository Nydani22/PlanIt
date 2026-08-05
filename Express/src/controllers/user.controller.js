const userService = require('../services/user.service');
const { decryptToken } = require('../utils/encryption.util');
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.id);
    
    if (!user) return res.status(404).json({ message: 'Felhasználó nem található' });
    
    
    const userResponse = user.toObject ? user.toObject() : { ...user._doc };
    
    if (userResponse.calendarFeedToken) {
        userResponse.calendarFeedToken = decryptToken(userResponse.calendarFeedToken);
    }

    res.status(200).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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


exports.regenerateFeedToken = async (req, res) => {
  try {
    const newToken = await userService.regenerateCalendarToken(req.user.id);
    
    res.status(200).json({ 
        success: true,
        message: 'Naptár link sikeresen frissítve.',
        token: newToken
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Hiba a token újragenerálásakor.' });
  }
};