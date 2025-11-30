const db = require('../config/database');
const getPool = db.getPool;

class ChatbotConfig {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.iconUrl = data.icon_url;
    this.primaryColor = data.primary_color;
    this.widgetCode = data.widget_code;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async findByUserId(userId) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM chatbot_configs WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return new ChatbotConfig(result.rows[0]);
  }

  static async create(data) {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO chatbot_configs (user_id, icon_url, primary_color, widget_code)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.userId,
        data.iconUrl || null,
        data.primaryColor || '#667eea',
        data.widgetCode || null
      ]
    );

    return new ChatbotConfig(result.rows[0]);
  }

  async save() {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE chatbot_configs 
       SET icon_url = $1, primary_color = $2, widget_code = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [
        this.iconUrl || null,
        this.primaryColor || '#667eea',
        this.widgetCode || null,
        this.id
      ]
    );

    if (result.rows.length > 0) {
      Object.assign(this, new ChatbotConfig(result.rows[0]));
    }

    return this;
  }

  static async upsert(data) {
    const pool = getPool();
    const existing = await this.findByUserId(data.userId);
    
    if (existing) {
      existing.iconUrl = data.iconUrl !== undefined ? data.iconUrl : existing.iconUrl;
      existing.primaryColor = data.primaryColor !== undefined ? data.primaryColor : existing.primaryColor;
      existing.widgetCode = data.widgetCode !== undefined ? data.widgetCode : existing.widgetCode;
      return await existing.save();
    } else {
      return await this.create(data);
    }
  }
}

module.exports = ChatbotConfig;

