const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

const connectDB = async () => {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Connect to SQLite database
    const dbPath = path.join(dataDir, 'bought-api.db');
    db = new Database(dbPath);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    console.log('SQLite database connected successfully');

    await initializeSchema();
  } catch (error) {
    console.error('SQLite connection error:', error.message);
    console.warn('⚠️  Server will continue without database connection. Some features may not work.');
    // Don't exit - allow server to start for development/testing
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

const initializeSchema = async () => {
  try {
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT,
        google_id TEXT UNIQUE,
        price_plan TEXT CHECK (price_plan IN ('plan1', 'plan2', 'plan3', 'trial')) DEFAULT NULL,
        stripe_customer_id TEXT,
        trial_started_at DATETIME,
        trial_expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add password column if it doesn't exist (for existing databases)
    try {
      db.exec(`ALTER TABLE users ADD COLUMN password TEXT`);
    } catch (error) {
      // Column already exists, ignore error
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }

    // Add 7-day free trial columns if they don't exist (for existing databases)
    try {
      db.exec(`ALTER TABLE users ADD COLUMN trial_started_at DATETIME`);
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }
    try {
      db.exec(`ALTER TABLE users ADD COLUMN trial_expires_at DATETIME`);
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    `);

    // Create chatbot_configs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS chatbot_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        icon_url TEXT,
        header_image_url TEXT,
        agent_image_url TEXT,
        banner_image_url TEXT,
        primary_color TEXT DEFAULT '#667eea',
        widget_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for chatbot_configs
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chatbot_configs_user_id ON chatbot_configs(user_id);
    `);

    console.log('Database schema initialized');
  } catch (error) {
    console.error('Schema initialization error:', error);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
};

module.exports = connectDB;
module.exports.getDB = getDB;
