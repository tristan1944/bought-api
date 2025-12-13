const db = require('../config/database');
const bcrypt = require('bcryptjs');
const getDB = db.getDB;

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.password = data.password;
    this.googleId = data.google_id;
    this.pricePlan = data.price_plan;
    this.stripeCustomerId = data.stripe_customer_id;
    this.trialStartedAt = data.trial_started_at || null;
    this.trialExpiresAt = data.trial_expires_at || null;
    this.createdAt = data.created_at;
    this._id = data.id; // For compatibility with existing code
  }

  static async findOne(query) {
    const database = getDB();
    let result;

    if (query.googleId) {
      result = database.prepare('SELECT * FROM users WHERE google_id = ?').get(query.googleId);
    } else if (query.email) {
      result = database.prepare('SELECT * FROM users WHERE email = ?').get(query.email.toLowerCase());
    } else if (query._id || query.id) {
      const id = query._id || query.id;
      result = database.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else {
      return null;
    }

    if (!result) {
      return null;
    }

    return new User(result);
  }

  static async findById(id) {
    const database = getDB();
    const result = database.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!result) {
      return null;
    }

    return new User(result);
  }

  static async create(data) {
    const database = getDB();
    let hashedPassword = null;
    
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    const stmt = database.prepare(`
      INSERT INTO users (email, name, password, google_id, price_plan, stripe_customer_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.email.toLowerCase(),
      data.name,
      hashedPassword,
      data.googleId || null,
      data.pricePlan || null,
      data.stripeCustomerId || null
    );

    // Get the created user
    const result = database.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    return new User(result);
  }

  async comparePassword(password) {
    if (!this.password) {
      return false;
    }
    return await bcrypt.compare(password, this.password);
  }

  async save() {
    const database = getDB();
    let hashedPassword = this.password;
    
    // If password is being updated and it's not already hashed, hash it
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      hashedPassword = await bcrypt.hash(this.password, 10);
    }

    const stmt = database.prepare(`
      UPDATE users 
      SET email = ?, name = ?, password = ?, google_id = ?, price_plan = ?, stripe_customer_id = ?, trial_started_at = ?, trial_expires_at = ?
      WHERE id = ?
    `);

    stmt.run(
      this.email,
      this.name,
      hashedPassword,
      this.googleId || null,
      this.pricePlan || null,
      this.stripeCustomerId || null,
      this.trialStartedAt || null,
      this.trialExpiresAt || null,
      this.id
    );

    // Get the updated user
    const result = database.prepare('SELECT * FROM users WHERE id = ?').get(this.id);
    if (result) {
      Object.assign(this, new User(result));
    }

    return this;
  }
}

module.exports = User;
