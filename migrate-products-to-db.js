const fs = require('fs');
const { initDatabase, query } = require('./database/hybrid-init');

async function migrateProductsToDatabase() {
    try {
        console.log('🚀 Iniciando migración de productos...');

        // Initialize database connection
        await initDatabase();

        // Read products from JSON file
        const productsData = JSON.parse(fs.readFileSync('./data/products.json', 'utf8'));
        console.log(`📦 Encontrados ${productsData.length} productos en el JSON`);

        // Check if products already exist in database
        const existingProducts = await query('SELECT COUNT(*) as count FROM products');
        const existingCount = parseInt(existingProducts.rows[0].count);
        console.log(`📊 Productos existentes en la base de datos: ${existingCount}`);

        if (existingCount > 0) {
            console.log('⚠️  Ya existen productos en la base de datos.');
            console.log('¿Deseas continuar? Se eliminarán todos los productos existentes.');

            // Clear existing products
            await query('DELETE FROM products');
            console.log('🗑️  Productos existentes eliminados');
        }

        // Insert products into database
        let successCount = 0;
        let errorCount = 0;

        for (const product of productsData) {
            try {
                const insertQuery = `
                    INSERT INTO products (
                        title, description, price, sale_price, sku, stock,
                        images, category, tags, rating, attributes, is_active, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW()
                    )
                `;

                const values = [
                    product.title,
                    product.description,
                    product.price,
                    product.salePrice || product.sale_price || null,
                    product.sku,
                    product.stock || 0,
                    JSON.stringify(product.images || []),
                    product.category,
                    JSON.stringify(product.tags || []),
                    product.rating || 0,
                    JSON.stringify(product.attributes || {})
                ];

                await query(insertQuery, values);
                successCount++;
                console.log(`✅ Migrado: ${product.title}`);

            } catch (error) {
                errorCount++;
                console.error(`❌ Error migrando ${product.title}:`, error.message);
            }
        }

        console.log('\n🎉 Migración completada!');
        console.log(`✅ Productos migrados exitosamente: ${successCount}`);
        console.log(`❌ Errores: ${errorCount}`);

        // Verify migration
        const finalCount = await query('SELECT COUNT(*) as count FROM products WHERE is_active = true');
        console.log(`📊 Total de productos activos en la base de datos: ${finalCount.rows[0].count}`);

    } catch (error) {
        console.error('💥 Error durante la migración:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the migration
migrateProductsToDatabase();