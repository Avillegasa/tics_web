const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getCurrentUser,
    userValidationRules,
    updateValidationRules
} = require('../controllers/userController');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');

// Public routes
router.post('/register', userValidationRules(), registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', authenticateToken, getCurrentUser);

// Admin routes
router.get('/', authenticateToken, requireAdmin, getAllUsers);

// User-specific routes (owner or admin)
router.get('/:id', authenticateToken, requireOwnerOrAdmin, getUserById);
router.put('/:id', authenticateToken, requireOwnerOrAdmin, updateValidationRules(), updateUser);

// Admin-only routes
router.delete('/:id', authenticateToken, requireAdmin, deleteUser);

module.exports = router;