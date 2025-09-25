const { initDatabase, query } = require('./database/hybrid-init');
const ImageHelper = require('./utils/imageHelper');

async function updateProductImages() {
    try {
        console.log('🖼️  Iniciando actualización de imágenes de productos...');

        // Initialize database connection
        await initDatabase();

        // Get all products
        const result = await query('SELECT id, title, category, images FROM products');
        const products = result.rows;

        console.log(`📦 Encontrados ${products.length} productos para actualizar`);

        let updatedCount = 0;

        for (const product of products) {
            try {
                let currentImages = [];

                // Parse existing images
                if (product.images) {
                    try {
                        currentImages = JSON.parse(product.images);
                    } catch (e) {
                        console.warn(`⚠️  Error parsing images for ${product.title}:`, e.message);
                        currentImages = [];
                    }
                }

                // Process images using ImageHelper
                const processedImages = ImageHelper.processProductImages(currentImages, product.category);

                // Update product with processed images
                const updateQuery = `
                    UPDATE products
                    SET images = $1, updated_at = NOW()
                    WHERE id = $2
                `;

                await query(updateQuery, [
                    JSON.stringify(processedImages),
                    product.id
                ]);

                updatedCount++;
                console.log(`✅ Actualizado: ${product.title} - Categoría: ${product.category}`);
                console.log(`   📸 Imágenes: ${processedImages.join(', ')}`);

            } catch (error) {
                console.error(`❌ Error actualizando ${product.title}:`, error.message);
            }
        }

        console.log(`\n🎉 Actualización completada!`);
        console.log(`✅ Productos actualizados: ${updatedCount}`);
        console.log(`📸 Todas las imágenes externas han sido reemplazadas con placeholders locales`);

    } catch (error) {
        console.error('💥 Error durante la actualización:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the update
updateProductImages();