/**
 * Image Helper Utilities
 * Handles product image management and placeholders
 */

const path = require('path');
const fs = require('fs');

class ImageHelper {
    // Map categories to their placeholder images
    static CATEGORY_PLACEHOLDERS = {
        'smartphones': '/images/products/smartphone-placeholder.svg',
        'smartphone': '/images/products/smartphone-placeholder.svg',
        'móviles': '/images/products/smartphone-placeholder.svg',
        'celulares': '/images/products/smartphone-placeholder.svg',

        'laptops': '/images/products/laptop-placeholder.svg',
        'laptop': '/images/products/laptop-placeholder.svg',
        'portátiles': '/images/products/laptop-placeholder.svg',
        'computadoras': '/images/products/laptop-placeholder.svg',

        'tablets': '/images/products/tablet-placeholder.svg',
        'tablet': '/images/products/tablet-placeholder.svg',

        'audio': '/images/products/audio-placeholder.svg',
        'auriculares': '/images/products/audio-placeholder.svg',
        'audifonos': '/images/products/audio-placeholder.svg',
        'altavoces': '/images/products/audio-placeholder.svg',
        'sonido': '/images/products/audio-placeholder.svg',

        'cámaras': '/images/products/camera-placeholder.svg',
        'cámara': '/images/products/camera-placeholder.svg',
        'cameras': '/images/products/camera-placeholder.svg',
        'fotografía': '/images/products/camera-placeholder.svg',

        'tecnología': '/images/products/default-placeholder.svg',
        'electrónicos': '/images/products/default-placeholder.svg',
        'gadgets': '/images/products/default-placeholder.svg'
    };

    /**
     * Get placeholder image for a category
     * @param {string} category - Product category
     * @returns {string} Placeholder image path
     */
    static getPlaceholderForCategory(category) {
        if (!category) return '/images/products/default-placeholder.svg';

        const normalizedCategory = category.toLowerCase().trim();
        return this.CATEGORY_PLACEHOLDERS[normalizedCategory] || '/images/products/default-placeholder.svg';
    }

    /**
     * Process product images - convert URLs to local placeholders if needed
     * @param {Array} images - Array of image URLs
     * @param {string} category - Product category
     * @returns {Array} Processed image array
     */
    static processProductImages(images, category) {
        if (!images || !Array.isArray(images) || images.length === 0) {
            return [this.getPlaceholderForCategory(category)];
        }

        // Check if images are external URLs (Unsplash, etc.)
        const processedImages = images.map(image => {
            if (typeof image !== 'string') return this.getPlaceholderForCategory(category);

            // If it's an external URL, replace with placeholder
            if (image.startsWith('http')) {
                return this.getPlaceholderForCategory(category);
            }

            // If it's already a local path, keep it
            return image;
        });

        return processedImages;
    }

    /**
     * Validate image file
     * @param {Object} file - Multer file object
     * @returns {Object} Validation result
     */
    static validateImageFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.mimetype)) {
            return {
                valid: false,
                error: 'Tipo de archivo no permitido. Use JPG, PNG, WebP o SVG.'
            };
        }

        if (file.size > maxSize) {
            return {
                valid: false,
                error: 'El archivo es demasiado grande. Máximo 5MB.'
            };
        }

        return { valid: true };
    }

    /**
     * Generate unique filename for uploaded image
     * @param {Object} file - Multer file object
     * @returns {string} Unique filename
     */
    static generateImageFilename(file) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const extension = path.extname(file.originalname);
        return `product_${timestamp}_${random}${extension}`;
    }

    /**
     * Get upload path for product images
     * @returns {string} Upload directory path
     */
    static getUploadPath() {
        const uploadPath = path.join(process.cwd(), 'uploads', 'products');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        return uploadPath;
    }

    /**
     * Delete image file from filesystem
     * @param {string} imagePath - Path to image file
     * @returns {boolean} Success status
     */
    static deleteImageFile(imagePath) {
        try {
            if (imagePath && !imagePath.includes('placeholder')) {
                const fullPath = path.join(process.cwd(), imagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error deleting image file:', error);
            return false;
        }
    }

    /**
     * Convert uploaded file to database-ready format
     * @param {Object} file - Multer file object
     * @returns {string} Database-ready image path
     */
    static fileToDbPath(file) {
        return `/uploads/products/${file.filename}`;
    }
}

module.exports = ImageHelper;