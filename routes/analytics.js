const express = require('express');
const { body } = require('express-validator');
const AnalyticsController = require('../controllers/analyticsController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation for tracking events
const trackEventValidation = [
    body('event_type')
        .isIn(['product_view', 'cart_add', 'search', 'filter_use', 'page_view'])
        .withMessage('Invalid event type'),
    body('product_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Product ID must be a positive integer'),
    body('category')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Category must be less than 100 characters'),
    body('search_query')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Search query must be less than 500 characters'),
    body('filter_data')
        .optional()
        .isObject()
        .withMessage('Filter data must be an object')
];

// Public route - Track events (no auth required for frontend tracking)
router.post('/track', trackEventValidation, AnalyticsController.trackEvent);

// Admin-only routes
router.get('/dashboard', authenticateToken, requireAdmin, AnalyticsController.getDashboard);
router.get('/product/:productId', authenticateToken, requireAdmin, AnalyticsController.getProductAnalytics);
router.get('/search', authenticateToken, requireAdmin, AnalyticsController.getSearchAnalytics);

module.exports = router;