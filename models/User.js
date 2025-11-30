const db = require('../config/database');
const getPool = db.getPool;

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.googleId = data.google_id;
    this.pricePlan = data.price_plan;
    this.stripeCustomerId = data.stripe_customer_id;
    this.createdAt = data.created_at;
    this._id = data.id; // For compatibility with existing code
  }

  static async findOne(query) {
    const pool = getPool();
    let result;

    if (query.googleId) {
      result = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [query.googleId]
      );
    } else if (query.email) {
      result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [query.email.toLowerCase()]
      );
    } else if (query._id || query.id) {
      const id = query._id || query.id;
      result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
    } else {
      return null;
    }

    if (result.rows.length === 0) {
      return null;
    }

    return new User(result.rows[0]);
  }

  static async findById(id) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new User(result.rows[0]);
  }

  static async create(data) {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO users (email, name, google_id, price_plan, stripe_customer_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.email.toLowerCase(),
        data.name,
        data.googleId || null,
        data.pricePlan || null,
        data.stripeCustomerId || null
      ]
    );

    return new User(result.rows[0]);
  }

  async save() {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE users 
       SET email = $1, name = $2, google_id = $3, price_plan = $4, stripe_customer_id = $5
       WHERE id = $6
       RETURNING *`,
      [
        this.email,
        this.name,
        this.googleId || null,
        this.pricePlan || null,
        this.stripeCustomerId || null,
        this.id
      ]
    );

    if (result.rows.length > 0) {
      Object.assign(this, new User(result.rows[0]));
    }

    return this;
  }
}

module.exports = User;
