const fs = require('fs');
const path = require('path');

class AmazonDatasetCleaner {
    constructor() {
        this.inputFile = path.join(__dirname, '../datasets/amazon.csv');
        this.outputFile = path.join(__dirname, '../datasets/amazon_cleaned.csv');
        this.categories = new Map();
        this.processedProducts = new Set();
    }

    // Limpiar y normalizar precio
    cleanPrice(priceStr) {
        if (!priceStr || priceStr === 'null' || priceStr === '') return null;

        // Remover símbolo de rupia y comas
        const cleaned = priceStr.toString().replace(/[₹,]/g, '').trim();
        const price = parseFloat(cleaned);

        return isNaN(price) ? null : price;
    }

    // Limpiar rating
    cleanRating(ratingStr) {
        if (!ratingStr || ratingStr === 'null' || ratingStr === '') return 0.0;

        const rating = parseFloat(ratingStr.toString());
        return isNaN(rating) ? 0.0 : Math.min(5.0, Math.max(0.0, rating));
    }

    // Limpiar rating count
    cleanRatingCount(countStr) {
        if (!countStr || countStr === 'null' || countStr === '') return 0;

        // Remover comas y convertir a número
        const cleaned = countStr.toString().replace(/,/g, '').trim();
        const count = parseInt(cleaned);

        return isNaN(count) ? 0 : count;
    }

    // Normalizar categoría
    normalizeCategory(categoryStr) {
        if (!categoryStr || categoryStr === 'null' || categoryStr === '') return 'Electronics';

        // Tomar la primera categoría principal
        const categories = categoryStr.split('|');
        let mainCategory = categories[0] || 'Electronics';

        // Normalizar nombres comunes
        const categoryMap = {
            'Computers&Accessories': 'Electronics',
            'Electronics': 'Electronics',
            'Home&Kitchen': 'Home & Kitchen',
            'Fashion': 'Fashion',
            'Sports': 'Sports & Outdoors',
            'Books': 'Books',
            'Toys': 'Toys & Games'
        };

        return categoryMap[mainCategory] || mainCategory;
    }

    // Generar SKU único
    generateSKU(productId, index) {
        if (productId && productId !== 'null') {
            return `AMZ-${productId}`;
        }
        return `AMZ-${Date.now()}-${index}`;
    }

    // Limpiar texto
    cleanText(text) {
        if (!text || text === 'null') return '';

        return text.toString()
            .replace(/\|/g, '. ')  // Reemplazar pipes con puntos
            .replace(/\s+/g, ' ')  // Normalizar espacios
            .trim()
            .substring(0, 1000);   // Limitar longitud
    }

    // Extraer primera imagen válida
    extractMainImage(imgLink) {
        if (!imgLink || imgLink === 'null') return null;

        // Si hay múltiples URLs, tomar la primera válida
        const urls = imgLink.split(',');
        for (let url of urls) {
            url = url.trim();
            if (url.startsWith('http') && (url.includes('amazon') || url.includes('media-amazon'))) {
                return url;
            }
        }

        return null;
    }

    // Procesar línea del CSV
    processLine(line, index) {
        const fields = this.parseCSVLine(line);

        if (fields.length < 16) {
            console.log(`Línea ${index + 1}: Campos insuficientes (${fields.length})`);
            return null;
        }

        const [
            product_id, product_name, category, discounted_price, actual_price,
            discount_percentage, rating, rating_count, about_product, user_id,
            user_name, review_id, review_title, review_content, img_link, product_link
        ] = fields;

        // Validar campos obligatorios
        if (!product_name || product_name === 'null' || product_name.trim() === '') {
            console.log(`Línea ${index + 1}: Nombre de producto vacío`);
            return null;
        }

        const cleanedPrice = this.cleanPrice(discounted_price || actual_price);
        if (!cleanedPrice || cleanedPrice <= 0) {
            console.log(`Línea ${index + 1}: Precio inválido`);
            return null;
        }

        // Evitar duplicados por product_id
        if (product_id && this.processedProducts.has(product_id)) {
            return null;
        }

        if (product_id) {
            this.processedProducts.add(product_id);
        }

        const normalizedCategory = this.normalizeCategory(category);
        const sku = this.generateSKU(product_id, index);
        const mainImage = this.extractMainImage(img_link);

        // Construir objeto de producto limpio
        return {
            sku: sku,
            title: this.cleanText(product_name).substring(0, 200),
            description: this.cleanText(about_product),
            price: cleanedPrice,
            sale_price: this.cleanPrice(actual_price) !== cleanedPrice ? this.cleanPrice(actual_price) : null,
            category: normalizedCategory,
            rating: this.cleanRating(rating),
            rating_count: this.cleanRatingCount(rating_count),
            stock: Math.floor(Math.random() * 100) + 1, // Stock aleatorio 1-100
            image_url: mainImage,
            product_url: product_link && product_link !== 'null' ? product_link : null,
            is_active: true
        };
    }

    // Parser simple de CSV que maneja comillas
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

    // Procesar archivo completo
    async processFile() {
        try {
            console.log('🚀 Iniciando limpieza del dataset de Amazon...');

            const fileContent = fs.readFileSync(this.inputFile, 'utf-8');
            const lines = fileContent.split('\n').filter(line => line.trim());

            console.log(`📊 Total de líneas: ${lines.length}`);

            // Saltar header
            const dataLines = lines.slice(1);
            const cleanedProducts = [];
            let skipped = 0;

            for (let i = 0; i < dataLines.length; i++) {
                const product = this.processLine(dataLines[i], i);

                if (product) {
                    cleanedProducts.push(product);
                } else {
                    skipped++;
                }

                if ((i + 1) % 100 === 0) {
                    console.log(`📈 Procesadas ${i + 1}/${dataLines.length} líneas...`);
                }
            }

            console.log(`✅ Productos válidos: ${cleanedProducts.length}`);
            console.log(`⚠️  Líneas omitidas: ${skipped}`);

            // Generar CSV limpio
            await this.generateCleanCSV(cleanedProducts);

            // Generar reporte de categorías
            this.generateCategoryReport(cleanedProducts);

            console.log('🎉 Limpieza completada exitosamente!');

        } catch (error) {
            console.error('❌ Error procesando archivo:', error);
            throw error;
        }
    }

    // Generar archivo CSV limpio
    async generateCleanCSV(products) {
        const headers = [
            'sku', 'title', 'description', 'price', 'sale_price',
            'category', 'rating', 'rating_count', 'stock',
            'image_url', 'product_url', 'is_active'
        ];

        let csvContent = headers.join(',') + '\n';

        for (const product of products) {
            const row = headers.map(header => {
                let value = product[header];

                // Manejar valores nulos
                if (value === null || value === undefined) {
                    value = '';
                }

                // Escapar comillas y envolver en comillas si contiene comas
                if (typeof value === 'string') {
                    value = value.replace(/"/g, '""');
                    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                        value = `"${value}"`;
                    }
                }

                return value;
            });

            csvContent += row.join(',') + '\n';
        }

        fs.writeFileSync(this.outputFile, csvContent, 'utf-8');
        console.log(`💾 Archivo limpio guardado: ${this.outputFile}`);
    }

    // Generar reporte de categorías
    generateCategoryReport(products) {
        const categoryStats = {};

        products.forEach(product => {
            const category = product.category;
            if (!categoryStats[category]) {
                categoryStats[category] = {
                    count: 0,
                    avgPrice: 0,
                    avgRating: 0
                };
            }

            categoryStats[category].count++;
            categoryStats[category].avgPrice += product.price;
            categoryStats[category].avgRating += product.rating;
        });

        console.log('\n📊 Reporte de Categorías:');
        console.log('========================');

        Object.keys(categoryStats).forEach(category => {
            const stats = categoryStats[category];
            stats.avgPrice = (stats.avgPrice / stats.count).toFixed(2);
            stats.avgRating = (stats.avgRating / stats.count).toFixed(1);

            console.log(`${category}: ${stats.count} productos, Precio promedio: ₹${stats.avgPrice}, Rating promedio: ${stats.avgRating}`);
        });
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const cleaner = new AmazonDatasetCleaner();
    cleaner.processFile().catch(console.error);
}

module.exports = AmazonDatasetCleaner;