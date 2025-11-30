const { Pool } = require('pg');

let pool;

const connectDB = async () => {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    await pool.query('SELECT NOW()');
    console.log('PostgreSQL connected successfully');

    await initializeSchema();
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    process.exit(1);
  }
};

const initializeSchema = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        google_id VARCHAR(255) UNIQUE,
        price_plan VARCHAR(50) CHECK (price_plan IN ('plan1', 'plan2', 'plan3')) DEFAULT NULL,
        stripe_customer_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    `);

    console.log('Database schema initialized');
  } catch (error) {
    console.error('Schema initialization error:', error);
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return pool;
};

module.exports = connectDB;
module.exports.getPool = getPool;
