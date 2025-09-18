const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function checkDatabase() {
    try {
        // Test connection
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL');

        // Check tables
        const tablesResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        `);
        console.log('\n📋 Tables found:', tablesResult.rows.map(r => r.table_name));

        // Check users
        const usersResult = await client.query('SELECT id, username, email, role FROM users');
        console.log('\n👥 Users in database:');
        console.table(usersResult.rows);

        client.release();

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabase();