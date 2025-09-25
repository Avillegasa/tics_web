// Hybrid database initialization - tries PostgreSQL first, falls back to SQLite
const postgresInit = require('./init');
const sqliteInit = require('./sqlite-fallback');

let dbType = 'unknown';
let queryFunction;

const initDatabase = async () => {
    console.log('🚀 Starting database initialization...');

    try {
        console.log('🐘 Attempting PostgreSQL connection...');
        await postgresInit.initDatabase();
        dbType = 'postgresql';
        queryFunction = postgresInit.query;
        console.log('✅ Using PostgreSQL database');
        return;
    } catch (error) {
        // Check if it's just a trigger error (which is acceptable)
        if (error.message && error.message.includes('already exists')) {
            console.log('⚠️  Some database objects already exist, continuing...');
            dbType = 'postgresql';
            queryFunction = postgresInit.query;
            console.log('✅ Using PostgreSQL database');
            return;
        }

        console.log('⚠️  PostgreSQL connection failed, falling back to SQLite...');
        console.log('Error details:', error.message);

        try {
            await sqliteInit.initSQLiteDatabase();
            dbType = 'sqlite';
            queryFunction = sqliteInit.query;
            console.log('✅ Using SQLite database (fallback mode)');
            console.log('💡 For production, please configure PostgreSQL properly');
            return;
        } catch (sqliteError) {
            console.error('❌ Both PostgreSQL and SQLite failed!');
            console.error('PostgreSQL error:', error.message);
            console.error('SQLite error:', sqliteError.message);
            throw new Error('Unable to initialize any database');
        }
    }
};

const query = (text, params = []) => {
    if (!queryFunction) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return queryFunction(text, params);
};

const getDatabaseType = () => dbType;

module.exports = {
    initDatabase,
    query,
    getDatabaseType
};