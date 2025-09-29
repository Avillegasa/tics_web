const fs = require('fs');
const path = require('path');
const { pool, query } = require('../database/init');

class AmazonProductImporter {
    constructor() {
        this.csvFile = path.join(__dirname, '../datasets/amazon_cleaned.csv');
        this.batchSize = 50; // Insertar en lotes de 50
    }

    // Leer y parsear CSV
    parseCSV() {
        const csvContent = fs.readFileSync(this.csvFile, 'utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());

        // Extraer headers
        const headers = this.parseCSVLine(lines[0]);

        // Procesar datos
        const products = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const product = {};
                headers.forEach((header, index) => {
                    product[header] = values[index] || null;
                });
                products.push(product);
            }
        }

        return products;
    }

    // Parser CSV simple
    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        fields.push(current);
        return fields;
    }

    // Convertir producto para la base de datos
    transformProduct(csvProduct) {
        // Crear array de imágenes si existe imagen
        const images = csvProduct.image_url ? [csvProduct.image_url] : [];

        // Crear objeto de atributos adicionales
        const attributes = {
            source: 'amazon',
            original_url: csvProduct.product_url,
            import_date: new Date().toISOString()
        };

        return {
            title: csvProduct.title,
            description: csvProduct.description,
            price: parseFloat(csvProduct.price),
            sale_price: csvProduct.sale_price ? parseFloat(csvProduct.sale_price) : null,
            sku: csvProduct.sku,
            stock: parseInt(csvProduct.stock) || 0,
            category: csvProduct.category,
            rating: parseFloat(csvProduct.rating) || 0,
            images: JSON.stringify(images),
            attributes: JSON.stringify(attributes),
            is_active: csvProduct.is_active === 'true'
        };
    }

    // Insertar productos en lotes
    async insertProductsBatch(products) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            let inserted = 0;
            let skipped = 0;

            for (let i = 0; i < products.length; i += this.batchSize) {
                const batch = products.slice(i, i + this.batchSize);

                for (const product of batch) {
                    try {
                        const transformedProduct = this.transformProduct(product);

                        // Verificar si el SKU ya existe
                        const existingProduct = await client.query(
                            'SELECT id FROM products WHERE sku = $1',
                            [transformedProduct.sku]
                        );

                        if (existingProduct.rows.length > 0) {
                            console.log(`⚠️  SKU ya existe: ${transformedProduct.sku}`);
                            skipped++;
                            continue;
                        }

                        // Insertar nuevo producto
                        await client.query(`
                            INSERT INTO products (
                                title, description, price, sale_price, sku, stock,
                                category, rating, images, attributes, is_active
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        `, [
                            transformedProduct.title,
                            transformedProduct.description,
                            transformedProduct.price,
                            transformedProduct.sale_price,
                            transformedProduct.sku,
                            transformedProduct.stock,
                            transformedProduct.category,
                            transformedProduct.rating,
                            transformedProduct.images,
                            transformedProduct.attributes,
                            transformedProduct.is_active
                        ]);

                        inserted++;

                    } catch (error) {
                        console.error(`❌ Error insertando producto ${product.sku}:`, error.message);
                        skipped++;
                    }
                }

                console.log(`📈 Procesados ${Math.min(i + this.batchSize, products.length)}/${products.length} productos...`);
            }

            await client.query('COMMIT');

            console.log(`✅ Productos insertados: ${inserted}`);
            console.log(`⚠️  Productos omitidos: ${skipped}`);

            return { inserted, skipped };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Proceso principal de importación
    async importProducts() {
        try {
            console.log('🚀 Iniciando importación de productos de Amazon...');

            // Verificar que el archivo existe
            if (!fs.existsSync(this.csvFile)) {
                throw new Error(`Archivo no encontrado: ${this.csvFile}`);
            }

            // Parsear CSV
            console.log('📖 Leyendo archivo CSV...');
            const products = this.parseCSV();
            console.log(`📊 Productos encontrados: ${products.length}`);

            if (products.length === 0) {
                console.log('⚠️  No hay productos para importar');
                return;
            }

            // Importar productos
            console.log('💾 Insertando productos en la base de datos...');
            const result = await this.insertProductsBatch(products);

            console.log('🎉 Importación completada exitosamente!');
            console.log(`📈 Resumen: ${result.inserted} insertados, ${result.skipped} omitidos`);

        } catch (error) {
            console.error('❌ Error durante la importación:', error);
            throw error;
        }
    }

    // Limpiar productos importados (para testing)
    async cleanupImportedProducts() {
        try {
            console.log('🧹 Eliminando productos importados de Amazon...');

            const result = await query(`
                DELETE FROM products
                WHERE sku LIKE 'AMZ-%' OR attributes::text LIKE '%"source":"amazon"%'
            `);

            console.log(`✅ Eliminados ${result.rowCount} productos de Amazon`);

        } catch (error) {
            console.error('❌ Error durante la limpieza:', error);
            throw error;
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const args = process.argv.slice(2);
    const importer = new AmazonProductImporter();

    if (args.includes('--cleanup')) {
        importer.cleanupImportedProducts()
            .then(() => process.exit(0))
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
    } else {
        importer.importProducts()
            .then(() => process.exit(0))
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
    }
}

module.exports = AmazonProductImporter;