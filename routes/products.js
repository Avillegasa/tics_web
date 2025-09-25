const express = require('express');
const { body } = require('express-validator');
const ProductController = require('../controllers/productController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const productValidation = [
    body('title')
        .isLength({ min: 1, max: 200 })
        .withMessage('Title must be between 1 and 200 characters'),
    body('description')
        .optional()
        .isLength({ max: 2000 })
        .withMessage('Description must be less than 2000 characters'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    body('sale_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Sale price must be a positive number'),
    body('sku')
        .isLength({ min: 1, max: 50 })
        .withMessage('SKU must be between 1 and 50 characters'),
    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock must be a non-negative integer'),
    body('category')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Category must be less than 100 characters'),
    body('rating')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('Rating must be between 0 and 5'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    body('images')
        .optional()
        .isArray()
        .withMessage('Images must be an array'),
    body('attributes')
        .optional()
        .isObject()
        .withMessage('Attributes must be an object')
];

// Public routes
router.get('/', ProductController.getAllProducts);
router.get('/search', ProductController.searchProducts);
router.get('/search/suggestions', ProductController.getSearchSuggestions);
router.get('/featured', ProductController.getFeaturedProducts);
router.get('/categories', ProductController.getCategories);
router.get('/:id', ProductController.getProductById);
router.get('/:id/related', ProductController.getRelatedProducts);

// Admin-only routes
router.post('/', authenticateToken, requireAdmin, productValidation, ProductController.createProduct);
router.put('/:id', authenticateToken, requireAdmin, productValidation, ProductController.updateProduct);
router.delete('/:id', authenticateToken, requireAdmin, ProductController.deleteProduct);

module.exports = router;