# 🐘 PostgreSQL Setup Guide - TICS Store

## 🎯 Quick Start

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

### 2. Configure PostgreSQL

```bash
# Switch to postgres user and create database
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
-- Create user (optional, or use default postgres user)
CREATE USER tics_user WITH PASSWORD 'tics_password';

-- Create database
CREATE DATABASE tics_store OWNER tics_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE tics_store TO tics_user;

-- Exit
\q
```

### 3. Configure Environment

Update your `.env` file:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
CORS_ORIGIN=http://localhost:3000

# PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tics_store
DB_USER=postgres
DB_PASSWORD=postgres

# For deployment
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tics_store
```

### 4. Setup and Migrate

```bash
# Install dependencies
npm install

# Setup PostgreSQL database (creates database if not exists)
npm run db:setup

# Run migration (migrate products from JSON to PostgreSQL)
npm run db:migrate

# Start the server
npm start
```

## 🔧 Available Commands

```bash
# Development
npm run dev              # Start with nodemon (auto-reload)
npm start               # Start production server

# Database Management
npm run db:setup        # Create PostgreSQL database
npm run db:migrate      # Migrate data from JSON to PostgreSQL
npm run db:reset        # Force reset and migrate (⚠️ DESTROYS DATA)

# Testing
npm run lint            # Run ESLint
npm test               # Run tests
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
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
);
```

### Products Table
```sql
CREATE TABLE products (
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
);
```

### Orders & Order Items Tables
```sql
CREATE TABLE orders (
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
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);
```

## 🌐 API Endpoints

### Public Endpoints
```
GET  /api/products              # List all products (with filters)
GET  /api/products/featured     # Featured products
GET  /api/products/search?q=    # Search products
GET  /api/products/categories   # List categories
GET  /api/products/:id          # Get single product
GET  /api/products/:id/related  # Related products

POST /api/users/register        # User registration
POST /api/users/login          # User login
```

### Protected Endpoints (JWT Required)
```
GET  /api/users/profile        # Current user profile

# Admin Only
GET  /api/users               # List all users
POST /api/products            # Create product
PUT  /api/products/:id        # Update product
DELETE /api/products/:id      # Delete product (soft delete)
```

## 🔐 Default Credentials

**Admin Account:**
- Email: `admin@ticsstore.com`
- Password: `admin123`

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your_very_secure_random_string_here

# PostgreSQL (use connection string for cloud deployment)
DATABASE_URL=postgresql://username:password@host:port/database

# CORS
CORS_ORIGIN=https://yourdomain.com
```

### Popular Deployment Platforms

**Heroku:**
```bash
# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET=your_secret_here
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

**Vercel/Netlify:**
- Use PostgreSQL service like Supabase, PlanetScale, or Neon
- Set environment variables in platform settings
- Deploy directly from GitHub

**Railway:**
```bash
# Connect PostgreSQL
railway add postgresql

# Deploy
railway deploy
```

## 🔍 Troubleshooting

### Common Issues

**Connection Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
Solution: Make sure PostgreSQL is running and accessible

**Authentication Error:**
```
Error: password authentication failed
```
Solution: Check username/password in `.env` file

**Database Not Found:**
```
Error: database "tics_store" does not exist
```
Solution: Run `npm run db:setup` to create the database

**Migration Fails:**
```
Error: relation "products" does not exist
```
Solution: Tables not created. Check database initialization

### Reset Everything

```bash
# ⚠️ WARNING: This will delete all data
npm run db:reset

# Then restart server
npm start
```

## 📝 Migration Notes

- ✅ SQLite replaced with PostgreSQL
- ✅ All product data migrated from JSON
- ✅ User authentication with PostgreSQL
- ✅ Admin panel fully functional
- ✅ APIs optimized for PostgreSQL
- ✅ JSONB fields for flexible data (tags, images, attributes)
- ✅ Auto-updating timestamps with triggers
- ✅ Proper indexing for performance

## 🎉 Success!

Once setup is complete, you'll have:
- 🐘 PostgreSQL database with all data
- 🛒 Fully functional e-commerce system
- 👥 User registration and authentication
- 🎛️  Admin panel for product management
- 🔍 Product search and filtering
- 📱 Responsive design for all devices