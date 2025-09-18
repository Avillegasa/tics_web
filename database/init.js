const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'store.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Initialize database tables
const initDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Users table created or already exists');
            });

            // Products table (enhanced from JSON)
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                sale_price DECIMAL(10,2),
                sku VARCHAR(50) UNIQUE NOT NULL,
                stock INTEGER DEFAULT 0,
                category VARCHAR(100),
                tags TEXT,
                rating DECIMAL(2,1) DEFAULT 0.0,
                images TEXT,
                attributes TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating products table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Products table created or already exists');
            });

            // Orders table
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                total_amount DECIMAL(10,2) NOT NULL,
                shipping_address TEXT,
                billing_address TEXT,
                payment_method VARCHAR(50),
                payment_status VARCHAR(20) DEFAULT 'pending',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`, (err) => {
                if (err) {
                    console.error('Error creating orders table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Orders table created or already exists');
            });

            // Order items table
            db.run(`CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`, (err) => {
                if (err) {
                    console.error('Error creating order_items table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Order items table created or already exists');

                // Create default admin user
                createDefaultAdmin().then(() => {
                    resolve();
                }).catch(reject);
            });
        });
    });
};

// Create default admin user
const createDefaultAdmin = async () => {
    return new Promise((resolve, reject) => {
        const checkAdmin = `SELECT COUNT(*) as count FROM users WHERE role = 'admin'`;

        db.get(checkAdmin, [], (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (row.count === 0) {
                // Create default admin user
                const hashedPassword = bcrypt.hashSync('admin123', 10);
                const insertAdmin = `INSERT INTO users (
                    username, email, password, first_name, last_name, role, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

                db.run(insertAdmin, [
                    'admin',
                    'admin@ticsstore.com',
                    hashedPassword,
                    'Admin',
                    'User',
                    'admin',
                    1
                ], function(err) {
                    if (err) {
                        console.error('Error creating admin user:', err.message);
                        reject(err);
                        return;
                    }
                    console.log('Default admin user created successfully');
                    resolve();
                });
            } else {
                console.log('Admin user already exists');
                resolve();
            }
        });
    });
};

module.exports = {
    db,
    initDatabase
};