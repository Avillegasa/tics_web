const fs = require('fs');
const path = require('path');
const { db, initDatabase } = require('../database/init');

async function simpleProductMigration() {
    try {
        console.log('🚀 Starting simple product migration...');

        // Initialize database
        await initDatabase();

        // Read products from JSON file
        const jsonPath = path.join(__dirname, '../data/products.json');
        const jsonData = fs.readFileSync(jsonPath, 'utf8');
        const products = JSON.parse(jsonData);

        console.log(`📄 Found ${products.length} products in JSON file`);

        // Clear existing products first
        await new Promise((resolve, reject) => {
            db.run('UPDATE products SET is_active = 0', [], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log('🗑️  Cleared existing products');
                    resolve();
                }
            });
        });

        // Insert products one by one
        const insertQuery = `
            INSERT INTO products (
                id, title, description, price, sale_price, sku, stock,
                category, tags, rating, images, attributes, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `;

        let successCount = 0;

        for (const product of products) {
            try {
                await new Promise((resolve, reject) => {
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
                            reject(err);
                        } else {
                            console.log(`✅ Migrated: ${product.title} (ID: ${product.id})`);
                            resolve();
                        }
                    });
                });
                successCount++;
            } catch (error) {
                console.error(`❌ Error migrating product ${product.id} (${product.title}):`, error.message);
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`✅ Successfully migrated: ${successCount} products`);

        // Verify results
        await new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as count FROM products WHERE is_active = 1', [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Verification: ${rows[0].count} active products in database`);
                    resolve();
                }
            });
        });

        console.log('\n🎉 Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

simpleProductMigration();