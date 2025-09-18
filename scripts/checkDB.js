const { db, initDatabase } = require('../database/init');

// Check products in database
console.log('🔍 Checking database contents...');

initDatabase().then(() => {

db.all('SELECT COUNT(*) as count FROM products', [], (err, rows) => {
    if (err) {
        console.error('❌ Error counting products:', err);
        return;
    }
    console.log(`📊 Total products in database: ${rows[0].count}`);
});

db.all('SELECT id, title, is_active FROM products LIMIT 5', [], (err, rows) => {
    if (err) {
        console.error('❌ Error fetching products:', err);
        return;
    }

    console.log('\n📋 First 5 products:');
    rows.forEach(row => {
        console.log(`  ${row.id}: ${row.title} (active: ${row.is_active})`);
    });

    process.exit(0);
});

}).catch(err => {
    console.error('❌ Database initialization error:', err);
    process.exit(1);
});

setTimeout(() => {
    console.log('⏰ Timeout reached');
    process.exit(1);
}, 5000);