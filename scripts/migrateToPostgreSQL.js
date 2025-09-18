const fs = require('fs');
const path = require('path');
const { initDatabase, query } = require('../database/init');

async function migrateToPostgreSQL() {
    try {
        console.log('🚀 Starting PostgreSQL migration...');

        // Initialize database and create tables
        await initDatabase();

        // Read products from JSON file
        const jsonPath = path.join(__dirname, '../data/products.json');

        if (!fs.existsSync(jsonPath)) {
            console.log('⚠️  No products.json file found, skipping product migration');
            return;
        }

        const jsonData = fs.readFileSync(jsonPath, 'utf8');
        const products = JSON.parse(jsonData);

        console.log(`📄 Found ${products.length} products in JSON file`);

        // Check if products already exist in database
        const checkQuery = 'SELECT COUNT(*) as count FROM products WHERE is_active = true';
        const checkResult = await query(checkQuery, []);

        if (parseInt(checkResult.rows[0].count) > 0) {
            console.log(`⚠️  Database already contains ${checkResult.rows[0].count} products.`);
            console.log('💡 Use --force flag to overwrite existing products');
            return;
        }

        console.log('🔄 Migrating products to PostgreSQL...');

        // Insert products
        let successCount = 0;
        let errorCount = 0;

        for (const product of products) {
            try {
                const insertQuery = `
                    INSERT INTO products (
                        title, description, price, sale_price, sku, stock,
                        category, tags, rating, images, attributes, is_active
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING id
                `;

                const params = [
                    product.title,
                    product.description,
                    product.price,
                    product.salePrice || null,
                    product.sku,
                    product.stock || 0,
                    product.category,
                    JSON.stringify(product.tags || []),
                    product.rating || 0.0,
                    JSON.stringify(product.images || []),
                    JSON.stringify(product.attributes || {}),
                    true
                ];

                const result = await query(insertQuery, params);
                console.log(`✅ Migrated: ${product.title} (New ID: ${result.rows[0].id})`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error migrating product ${product.title}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`✅ Successfully migrated: ${successCount} products`);
        console.log(`❌ Failed: ${errorCount} products`);

        // Verify results
        const verifyResult = await query('SELECT COUNT(*) as count FROM products WHERE is_active = true', []);
        console.log(`✅ Verification: ${verifyResult.rows[0].count} active products in PostgreSQL database`);

        console.log('\n🎉 PostgreSQL migration completed successfully!');
        console.log('💡 You can now start your server and use the PostgreSQL database');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

async function forceResetDatabase() {
    try {
        console.log('🚨 Force mode: Clearing existing data...');

        // Clear existing data
        await query('DELETE FROM order_items', []);
        await query('DELETE FROM orders', []);
        await query('DELETE FROM products', []);
        await query('DELETE FROM users WHERE role != \'admin\'', []);

        console.log('🗑️  Cleared existing data (kept admin user)');

        // Reset sequences
        await query('ALTER SEQUENCE products_id_seq RESTART WITH 1', []);
        await query('ALTER SEQUENCE orders_id_seq RESTART WITH 1', []);
        await query('ALTER SEQUENCE order_items_id_seq RESTART WITH 1', []);

        console.log('🔄 Reset ID sequences');

    } catch (error) {
        console.error('❌ Error clearing database:', error);
        throw error;
    }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--force')) {
    console.log('🚨 Force mode enabled - will replace existing data');

    forceResetDatabase().then(() => {
        migrateToPostgreSQL();
    }).catch(err => {
        console.error('❌ Error in force reset:', err);
        process.exit(1);
    });
} else {
    migrateToPostgreSQL();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️  Migration interrupted by user');
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught exception:', error);
    process.exit(1);
});