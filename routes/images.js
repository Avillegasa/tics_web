const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const ImageHelper = require('../utils/imageHelper');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, ImageHelper.getUploadPath());
    },
    filename: (req, file, cb) => {
        const filename = ImageHelper.generateImageFilename(file);
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const validation = ImageHelper.validateImageFile(file);
        if (validation.valid) {
            cb(null, true);
        } else {
            cb(new Error(validation.error), false);
        }
    }
});

// Upload single image
router.post('/upload', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No se ha subido ningún archivo'
            });
        }

        const imagePath = ImageHelper.fileToDbPath(req.file);

        res.json({
            success: true,
            message: 'Imagen subida exitosamente',
            image: {
                path: imagePath,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });

    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Upload multiple images
router.post('/upload-multiple', authenticateToken, requireAdmin, upload.array('images', 5), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No se han subido archivos'
            });
        }

        const images = req.files.map(file => ({
            path: ImageHelper.fileToDbPath(file),
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype
        }));

        res.json({
            success: true,
            message: `${images.length} imagen${images.length > 1 ? 'es' : ''} subida${images.length > 1 ? 's' : ''} exitosamente`,
            images: images
        });

    } catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Delete image
router.delete('/:filename', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { filename } = req.params;

        if (!filename) {
            return res.status(400).json({
                success: false,
                error: 'Nombre de archivo requerido'
            });
        }

        // Prevent deletion of placeholder images
        if (filename.includes('placeholder')) {
            return res.status(400).json({
                success: false,
                error: 'No se pueden eliminar las imágenes placeholder'
            });
        }

        const imagePath = `/uploads/products/${filename}`;
        const deleted = ImageHelper.deleteImageFile(imagePath);

        if (deleted) {
            res.json({
                success: true,
                message: 'Imagen eliminada exitosamente'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Imagen no encontrada'
            });
        }

    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Get available placeholders
router.get('/placeholders', (req, res) => {
    try {
        const placeholders = {
            smartphones: '/images/products/smartphone-placeholder.svg',
            laptops: '/images/products/laptop-placeholder.svg',
            tablets: '/images/products/tablet-placeholder.svg',
            audio: '/images/products/audio-placeholder.svg',
            cameras: '/images/products/camera-placeholder.svg',
            default: '/images/products/default-placeholder.svg'
        };

        res.json({
            success: true,
            placeholders: placeholders
        });

    } catch (error) {
        console.error('Error getting placeholders:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'El archivo es demasiado grande. Máximo 5MB.'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: 'Demasiados archivos. Máximo 5 imágenes.'
            });
        }
    }

    res.status(400).json({
        success: false,
        error: error.message || 'Error subiendo archivo'
    });
});

module.exports = router;