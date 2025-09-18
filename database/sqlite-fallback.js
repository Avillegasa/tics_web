const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../tics_store.db');
let db;

// Initialize SQLite database as fallback
const initSQLiteDatabase = () => {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ SQLite connection error:', err);
                reject(err);
                return;
            }
            console.log('✅ Connected to SQLite database (fallback mode)');
            createTables().then(resolve).catch(reject);
        });
    });
};

const createTables = async () => {
    return new Promise((resolve, reject) => {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                role TEXT DEFAULT 'customer',
                phone TEXT,
                address TEXT,
                city TEXT,
                postal_code TEXT,
                country TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createProductsTable = `
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                sale_price REAL,
                sku TEXT UNIQUE NOT NULL,
                stock INTEGER DEFAULT 0,
                category TEXT,
                tags TEXT DEFAULT '[]',
                rating REAL DEFAULT 0.0,
                images TEXT DEFAULT '[]',
                attributes TEXT DEFAULT '{}',
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createOrdersTable = `
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                order_number TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'pending',
                total_amount REAL NOT NULL,
                shipping_address TEXT,
                billing_address TEXT,
                payment_method TEXT,
                payment_status TEXT DEFAULT 'pending',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        const createOrderItemsTable = `
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                total_price REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
            )
        `;

        db.serialize(() => {
            db.run(createUsersTable, (err) => {
                if (err) reject(err);
                else console.log('✅ Users table created or already exists');
            });

            db.run(createProductsTable, (err) => {
                if (err) reject(err);
                else console.log('✅ Products table created or already exists');
            });

            db.run(createOrdersTable, (err) => {
                if (err) reject(err);
                else console.log('✅ Orders table created or already exists');
            });

            db.run(createOrderItemsTable, (err) => {
                if (err) reject(err);
                else console.log('✅ Order items table created or already exists');
            });

            // Create default admin user
            createDefaultAdmin().then(() => {
                console.log('✅ Database initialization completed successfully');
                resolve();
            }).catch(reject);
        });
    });
};

const createDefaultAdmin = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            // Check if admin exists
            db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'", async (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row.count === 0) {
                    const hashedPassword = await bcrypt.hash('admin123', 10);

                    db.run(`
                        INSERT INTO users (
                            username, email, password, first_name, last_name, role, is_active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, ['admin', 'admin@ticsstore.com', hashedPassword, 'Admin', 'User', 'admin', 1], (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log('✅ Default admin user created');
                            resolve();
                        }
                    });
                } else {
                    console.log('ℹ️  Admin user already exists');
                    resolve();
                }
            });
        } catch (error) {
            reject(error);
        }
    });
};

// SQLite query wrapper to match PostgreSQL interface
const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
        if (text.includes('RETURNING')) {
            // Handle RETURNING clause for SQLite
            const insertSql = text.replace(/RETURNING.*$/, '');
            db.run(insertSql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ rows: [{ id: this.lastID }] });
                }
            });
        } else if (text.toUpperCase().includes('SELECT') || text.toUpperCase().includes('WITH')) {
            db.all(text, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ rows });
                }
            });
        } else {
            db.run(text, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ rows: [], rowCount: this.changes });
                }
            });
        }
    });
};

module.exports = {
    initSQLiteDatabase,
    query,
    getDatabase: () => db
};