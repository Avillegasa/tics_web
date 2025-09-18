const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tics_store',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Use DATABASE_URL if available (for deployment)
const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: dbConfig.ssl })
    : new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL connection error:', err);
});

// Initialize database tables
const initDatabase = async () => {
    let client;

    try {
        // Test connection first
        client = await pool.connect();
        console.log('🚀 Initializing PostgreSQL database...');

        // Create users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                role VARCHAR(20) DEFAULT 'customer',
                phone VARCHAR(20),
                address TEXT,
                city VARCHAR(50),
                postal_code VARCHAR(10),
                country VARCHAR(50),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table created or already exists');

        // Create products table
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                sale_price DECIMAL(10,2),
                sku VARCHAR(50) UNIQUE NOT NULL,
                stock INTEGER DEFAULT 0,
                category VARCHAR(100),
                tags JSONB DEFAULT '[]'::jsonb,
                rating DECIMAL(2,1) DEFAULT 0.0,
                images JSONB DEFAULT '[]'::jsonb,
                attributes JSONB DEFAULT '{}'::jsonb,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Products table created or already exists');

        // Create orders table
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                total_amount DECIMAL(10,2) NOT NULL,
                shipping_address JSONB,
                billing_address JSONB,
                payment_method VARCHAR(50),
                payment_status VARCHAR(20) DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Orders table created or already exists');

        // Create order_items table
        await client.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Order items table created or already exists');

        // Create indexes for better performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
            CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
            CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        `);
        console.log('✅ Database indexes created');

        // Create trigger for updated_at timestamps
        await client.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        await client.query(`
            DROP TRIGGER IF EXISTS update_users_updated_at ON users;
            CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON users
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);

        await client.query(`
            DROP TRIGGER IF EXISTS update_products_updated_at ON products;
            CREATE TRIGGER update_products_updated_at
                BEFORE UPDATE ON products
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);

        await client.query(`
            DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
            CREATE TRIGGER update_orders_updated_at
                BEFORE UPDATE ON orders
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);

        console.log('✅ Database triggers created');

        // Create default admin user
        await createDefaultAdmin(client);

        console.log('🎉 Database initialization completed successfully');

    } catch (error) {
        console.error('❌ Error initializing database:', error);
        if (error.code === '28P01' || error.code === 'ECONNREFUSED') {
            console.error('🔧 PostgreSQL connection failed. Please check:');
            console.error('   1. PostgreSQL is running');
            console.error('   2. Database credentials in .env are correct');
            console.error('   3. Database user has proper permissions');
            console.error('');
            console.error('💡 To set up PostgreSQL:');
            console.error('   sudo -u postgres psql');
            console.error("   CREATE USER postgres WITH PASSWORD 'password';");
            console.error("   CREATE DATABASE tics_store OWNER postgres;");
        }
        throw error;
    } finally {
        if (client) client.release();
    }
};

// Create default admin user
const createDefaultAdmin = async (client) => {
    try {
        const checkAdmin = await client.query(
            "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
        );

        if (parseInt(checkAdmin.rows[0].count) === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);

            await client.query(`
                INSERT INTO users (
                    username, email, password, first_name, last_name, role, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                'admin',
                'admin@ticsstore.com',
                hashedPassword,
                'Admin',
                'User',
                'admin',
                true
            ]);

            console.log('✅ Default admin user created successfully');
        } else {
            console.log('ℹ️  Admin user already exists');
        }
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        throw error;
    }
};

// Query helper function
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('📊 Executed query', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('❌ Query error:', error);
        throw error;
    }
};

// Get client from pool
const getClient = async () => {
    return await pool.connect();
};

// Close pool
const closePool = async () => {
    await pool.end();
    console.log('🔌 Database connection pool closed');
};

module.exports = {
    pool,
    query,
    getClient,
    initDatabase,
    closePool
};