const { query } = require('../database/hybrid-init');
const { validationResult } = require('express-validator');
const ImageHelper = require('../utils/imageHelper');

class ProductController {
    static async getAllProducts(req, res) {
        try {
            const {
                category,
                minPrice,
                maxPrice,
                rating,
                inStock,
                onSale,
                sortBy = 'featured',
                limit,
                offset
            } = req.query;

            let queryText = `
                SELECT * FROM products
                WHERE is_active = true
            `;
            const params = [];
            let paramCount = 0;

            if (category && category !== 'all') {
                paramCount++;
                queryText += ` AND category = $${paramCount}`;
                params.push(category);
            }

            if (minPrice) {
                paramCount++;
                queryText += ` AND COALESCE(sale_price, price) >= $${paramCount}`;
                params.push(parseFloat(minPrice));
            }

            if (maxPrice) {
                paramCount++;
                queryText += ` AND COALESCE(sale_price, price) <= $${paramCount}`;
                params.push(parseFloat(maxPrice));
            }

            if (rating) {
                if (rating === '4+') {
                    queryText += ` AND rating >= 4.0`;
                } else if (rating === '4.5+') {
                    queryText += ` AND rating >= 4.5`;
                }
            }

            if (inStock === 'true') {
                queryText += ` AND stock > 0`;
            }

            if (onSale === 'true') {
                queryText += ` AND sale_price IS NOT NULL AND sale_price < price`;
            }

            switch (sortBy) {
                case 'price-asc':
                    queryText += ` ORDER BY COALESCE(sale_price, price) ASC`;
                    break;
                case 'price-desc':
                    queryText += ` ORDER BY COALESCE(sale_price, price) DESC`;
                    break;
                case 'rating':
                    queryText += ` ORDER BY rating DESC`;
                    break;
                case 'newest':
                    queryText += ` ORDER BY created_at DESC`;
                    break;
                case 'featured':
                default:
                    queryText += ` ORDER BY (CASE WHEN sale_price IS NOT NULL THEN 1 ELSE 0 END) DESC, rating DESC`;
                    break;
            }

            if (limit) {
                paramCount++;
                queryText += ` LIMIT $${paramCount}`;
                params.push(parseInt(limit));

                if (offset) {
                    paramCount++;
                    queryText += ` OFFSET $${paramCount}`;
                    params.push(parseInt(offset));
                }
            }

            const result = await query(queryText, params);

            res.json({
                success: true,
                products: result.rows,
                total: result.rows.length
            });
        } catch (error) {
            console.error('Error in getAllProducts:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async getProductById(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({ error: 'Valid product ID is required' });
            }

            const queryText = `SELECT * FROM products WHERE id = $1 AND is_active = true`;
            const result = await query(queryText, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json({
                success: true,
                product: result.rows[0]
            });
        } catch (error) {
            console.error('Error in getProductById:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async getFeaturedProducts(req, res) {
        try {
            const { limit = 4 } = req.query;

            const queryText = `
                SELECT * FROM products
                WHERE is_active = true
                AND (sale_price IS NOT NULL OR rating >= 4.5)
                ORDER BY (CASE WHEN sale_price IS NOT NULL THEN 1 ELSE 0 END) DESC, rating DESC
                LIMIT $1
            `;

            const result = await query(queryText, [parseInt(limit)]);

            res.json({
                success: true,
                products: result.rows
            });
        } catch (error) {
            console.error('Error in getFeaturedProducts:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async getRelatedProducts(req, res) {
        try {
            const { id } = req.params;
            const { limit = 4 } = req.query;

            if (!id || isNaN(id)) {
                return res.status(400).json({ error: 'Valid product ID is required' });
            }

            const getCurrentProductQuery = `SELECT category, tags FROM products WHERE id = $1 AND is_active = true`;
            const currentProductResult = await query(getCurrentProductQuery, [id]);

            if (currentProductResult.rows.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            const currentProduct = currentProductResult.rows[0];

            const queryText = `
                SELECT * FROM products
                WHERE is_active = true
                AND id != $1
                AND category = $2
                ORDER BY rating DESC
                LIMIT $3
            `;

            const result = await query(queryText, [id, currentProduct.category, parseInt(limit)]);

            res.json({
                success: true,
                products: result.rows
            });
        } catch (error) {
            console.error('Error in getRelatedProducts:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async searchProducts(req, res) {
        try {
            const { q: searchQuery, limit = 20, category, minPrice, maxPrice } = req.query;

            if (!searchQuery || searchQuery.trim() === '') {
                return ProductController.getAllProducts(req, res);
            }

            const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
            const searchPattern = `%${searchQuery.toLowerCase()}%`;

            let queryText = `
                SELECT *,
                    (CASE
                        WHEN LOWER(title) LIKE $1 THEN 10
                        WHEN LOWER(sku) LIKE $1 THEN 9
                        WHEN LOWER(category) LIKE $1 THEN 8
                        WHEN LOWER(description) LIKE $1 THEN 7
                        WHEN LOWER(CAST(tags AS TEXT)) LIKE $1 THEN 6
                        ELSE 0
                    END) as relevance_score
                FROM products
                WHERE is_active = true
                AND (
                    LOWER(title) LIKE $1 OR
                    LOWER(description) LIKE $1 OR
                    LOWER(category) LIKE $1 OR
                    LOWER(sku) LIKE $1 OR
                    LOWER(CAST(tags AS TEXT)) LIKE $1
                )
            `;

            const params = [searchPattern];
            let paramCount = 1;

            // Additional filters
            if (category && category !== 'all') {
                paramCount++;
                queryText += ` AND category = $${paramCount}`;
                params.push(category);
            }

            if (minPrice) {
                paramCount++;
                queryText += ` AND COALESCE(sale_price, price) >= $${paramCount}`;
                params.push(parseFloat(minPrice));
            }

            if (maxPrice) {
                paramCount++;
                queryText += ` AND COALESCE(sale_price, price) <= $${paramCount}`;
                params.push(parseFloat(maxPrice));
            }

            queryText += `
                ORDER BY relevance_score DESC, rating DESC,
                    (CASE WHEN sale_price IS NOT NULL THEN 1 ELSE 0 END) DESC
                LIMIT $${paramCount + 1}
            `;
            params.push(parseInt(limit));

            const result = await query(queryText, params);

            res.json({
                success: true,
                products: result.rows,
                total: result.rows.length,
                query: searchQuery
            });
        } catch (error) {
            console.error('Error in searchProducts:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async getSearchSuggestions(req, res) {
        try {
            const { q: searchQuery, limit = 5 } = req.query;

            if (!searchQuery || searchQuery.trim().length < 2) {
                return res.json({
                    success: true,
                    suggestions: []
                });
            }

            const searchPattern = `%${searchQuery.toLowerCase()}%`;

            const queryText = `
                SELECT id, title, category, price, sale_price, images, rating,
                    (CASE
                        WHEN LOWER(title) LIKE $1 THEN 10
                        WHEN LOWER(sku) LIKE $1 THEN 9
                        WHEN LOWER(category) LIKE $1 THEN 8
                        ELSE 5
                    END) as relevance_score
                FROM products
                WHERE is_active = true
                AND (
                    LOWER(title) LIKE $1 OR
                    LOWER(category) LIKE $1 OR
                    LOWER(sku) LIKE $1
                )
                ORDER BY relevance_score DESC, rating DESC
                LIMIT $2
            `;

            const result = await query(queryText, [searchPattern, parseInt(limit)]);

            const suggestions = result.rows.map(product => {
                let image = null;
                try {
                    if (product.images && typeof product.images === 'string') {
                        const images = JSON.parse(product.images);
                        image = Array.isArray(images) && images.length > 0 ? images[0] : null;
                    }
                } catch (e) {
                    console.warn('Error parsing images for product', product.id);
                }

                return {
                    id: product.id,
                    title: product.title,
                    category: product.category,
                    price: product.sale_price || product.price,
                    image: image,
                    type: 'product'
                };
            });

            res.json({
                success: true,
                suggestions
            });
        } catch (error) {
            console.error('Error in getSearchSuggestions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async getCategories(req, res) {
        try {
            const queryText = `
                SELECT category, COUNT(*) as product_count
                FROM products
                WHERE is_active = true AND category IS NOT NULL
                GROUP BY category
                ORDER BY category
            `;

            const result = await query(queryText, []);

            res.json({
                success: true,
                categories: result.rows
            });
        } catch (error) {
            console.error('Error in getCategories:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async createProduct(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const {
                title,
                description,
                price,
                sale_price,
                sku,
                stock,
                category,
                tags,
                rating,
                images,
                attributes
            } = req.body;

            const queryText = `
                INSERT INTO products (
                    title, description, price, sale_price, sku, stock,
                    category, tags, rating, images, attributes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
            `;

            const params = [
                title,
                description,
                price,
                sale_price || null,
                sku,
                stock || 0,
                category,
                JSON.stringify(tags || []),
                rating || 0.0,
                JSON.stringify(images || []),
                JSON.stringify(attributes || {})
            ];

            const result = await query(queryText, params);

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                productId: result.rows[0].id
            });
        } catch (error) {
            if (error.code === '23505') { // PostgreSQL unique constraint violation
                return res.status(400).json({ error: 'SKU already exists' });
            }
            console.error('Error in createProduct:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async updateProduct(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const {
                title,
                description,
                price,
                sale_price,
                sku,
                stock,
                category,
                tags,
                rating,
                images,
                attributes
            } = req.body;

            const queryText = `
                UPDATE products SET
                    title = $1, description = $2, price = $3, sale_price = $4,
                    sku = $5, stock = $6, category = $7, tags = $8,
                    rating = $9, images = $10, attributes = $11
                WHERE id = $12 AND is_active = true
                RETURNING id
            `;

            const params = [
                title,
                description,
                price,
                sale_price || null,
                sku,
                stock,
                category,
                JSON.stringify(tags || []),
                rating,
                JSON.stringify(images || []),
                JSON.stringify(attributes || {}),
                id
            ];

            const result = await query(queryText, params);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json({
                success: true,
                message: 'Product updated successfully'
            });
        } catch (error) {
            if (error.code === '23505') { // PostgreSQL unique constraint violation
                return res.status(400).json({ error: 'SKU already exists' });
            }
            console.error('Error in updateProduct:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async deleteProduct(req, res) {
        try {
            const { id } = req.params;

            if (!id || isNaN(id)) {
                return res.status(400).json({ error: 'Valid product ID is required' });
            }

            const queryText = `UPDATE products SET is_active = false WHERE id = $1 RETURNING id`;
            const result = await query(queryText, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json({
                success: true,
                message: 'Product deleted successfully'
            });
        } catch (error) {
            console.error('Error in deleteProduct:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = ProductController;