const { Pool } = require('pg');

async function setupPostgreSQL() {
    // Connection for creating database (connect to default postgres database)
    const setupPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: 'postgres', // Connect to default database first
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    });

    try {
        console.log('🔌 Connecting to PostgreSQL server...');

        // Test connection
        const client = await setupPool.connect();
        console.log('✅ Connected to PostgreSQL server');

        // Check if database exists
        const dbName = process.env.DB_NAME || 'tics_store';
        const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
        const dbResult = await client.query(checkDbQuery, [dbName]);

        if (dbResult.rows.length === 0) {
            // Create database
            console.log(`📅 Creating database '${dbName}'...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`✅ Database '${dbName}' created successfully`);
        } else {
            console.log(`ℹ️  Database '${dbName}' already exists`);
        }

        client.release();
        await setupPool.end();

        console.log('\n🎉 PostgreSQL setup completed!');
        console.log('💡 You can now run the migration script:');
        console.log('   npm run migrate');
        console.log('   or');
        console.log('   node scripts/migrateToPostgreSQL.js');

    } catch (error) {
        console.error('❌ PostgreSQL setup failed:', error.message);
        console.log('\n💡 Make sure PostgreSQL is running and accessible with these credentials:');
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   Port: ${process.env.DB_PORT || 5432}`);
        console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
        console.log(`   Password: ${process.env.DB_PASSWORD || 'postgres'}`);
        console.log('\n🔧 To install PostgreSQL locally:');
        console.log('   Ubuntu/Debian: sudo apt install postgresql postgresql-contrib');
        console.log('   macOS: brew install postgresql');
        console.log('   Windows: Download from https://www.postgresql.org/download/');
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️  Setup interrupted by user');
    process.exit(1);
});

setupPostgreSQL();