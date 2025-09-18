const fs = require('fs');
const path = require('path');
const { db, initDatabase } = require('../database/init');

async function migrateProductsFromJSON() {
    try {
        console.log('🚀 Starting product migration from JSON to database...');

        // Initialize database
        await initDatabase();

        // Read products from JSON file
        const jsonPath = path.join(__dirname, '../data/products.json');
        const jsonData = fs.readFileSync(jsonPath, 'utf8');
        const products = JSON.parse(jsonData);

        console.log(`📄 Found ${products.length} products in JSON file`);

        // Check if products already exist in database
        const checkQuery = 'SELECT COUNT(*) as count FROM products WHERE is_active = 1';

        db.get(checkQuery, [], async (err, row) => {
            if (err) {
                console.error('❌ Error checking existing products:', err);
                return;
            }

            if (row.count > 0) {
                console.log(`⚠️  Database already contains ${row.count} products. Skipping migration.`);
                console.log('To force migration, delete existing products first.');
                process.exit(0);
            }

            // Begin transaction
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                const insertQuery = `
                    INSERT INTO products (
                        id, title, description, price, sale_price, sku, stock,
                        category, tags, rating, images, attributes, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                `;

                let successCount = 0;
                let errorCount = 0;

                products.forEach((product, index) => {
                    const params = [
                        product.id,
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
                        JSON.stringify(product.attributes || {})
                    ];

                    db.run(insertQuery, params, function(err) {
                        if (err) {
                            console.error(`❌ Error inserting product ${product.id} (${product.title}):`, err.message);
                            errorCount++;
                        } else {
                            console.log(`✅ Migrated: ${product.title} (ID: ${product.id})`);
                            successCount++;
                        }

                        // Check if this is the last product
                        if (index === products.length - 1) {
                            if (errorCount > 0) {
                                console.log('⚠️  Rolling back transaction due to errors...');
                                db.run('ROLLBACK');
                            } else {
                                console.log('💾 Committing transaction...');
                                db.run('COMMIT');
                            }

                            console.log('\n📊 Migration Summary:');
                            console.log(`✅ Successfully migrated: ${successCount} products`);
                            console.log(`❌ Failed: ${errorCount} products`);

                            if (errorCount === 0) {
                                console.log('\n🎉 Migration completed successfully!');
                                console.log('💡 You can now update your frontend to use the API endpoints instead of JSON');
                                console.log('📋 Available endpoints:');
                                console.log('   GET /api/products - All products');
                                console.log('   GET /api/products/featured - Featured products');
                                console.log('   GET /api/products/:id - Single product');
                                console.log('   GET /api/products/search?q=term - Search products');
                            }

                            process.exit(errorCount > 0 ? 1 : 0);
                        }
                    });
                });
            });
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Add backup functionality
function backupExistingProducts() {
    return new Promise((resolve, reject) => {
        const backupQuery = 'SELECT * FROM products WHERE is_active = 1';

        db.all(backupQuery, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            if (rows.length > 0) {
                const backupPath = path.join(__dirname, '../data/products_backup.json');
                const backupData = rows.map(row => ({
                    ...row,
                    images: JSON.parse(row.images || '[]'),
                    tags: JSON.parse(row.tags || '[]'),
                    attributes: JSON.parse(row.attributes || '{}')
                }));

                fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
                console.log(`💾 Created backup at: ${backupPath}`);
            }

            resolve();
        });
    });
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--force')) {
    console.log('🚨 Force mode enabled - will replace existing products');

    backupExistingProducts().then(() => {
        // Clear existing products
        db.run('UPDATE products SET is_active = 0', [], (err) => {
            if (err) {
                console.error('❌ Error clearing existing products:', err);
                process.exit(1);
            }
            console.log('🗑️  Cleared existing products');
            migrateProductsFromJSON();
        });
    }).catch(err => {
        console.error('❌ Error creating backup:', err);
        process.exit(1);
    });
} else {
    migrateProductsFromJSON();
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