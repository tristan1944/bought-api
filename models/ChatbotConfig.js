const db = require('../config/database');
const getPool = db.getPool;

class ChatbotConfig {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.iconUrl = data.icon_url;
    this.headerImageUrl = data.header_image_url;
    this.agentImageUrl = data.agent_image_url;
    this.bannerImageUrl = data.banner_image_url;
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
      `INSERT INTO chatbot_configs (user_id, icon_url, header_image_url, agent_image_url, banner_image_url, primary_color, widget_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.userId,
        data.iconUrl || null,
        data.headerImageUrl || null,
        data.agentImageUrl || null,
        data.bannerImageUrl || null,
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
       SET icon_url = $1, header_image_url = $2, agent_image_url = $3, banner_image_url = $4, primary_color = $5, widget_code = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        this.iconUrl || null,
        this.headerImageUrl || null,
        this.agentImageUrl || null,
        this.bannerImageUrl || null,
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
      existing.headerImageUrl = data.headerImageUrl !== undefined ? data.headerImageUrl : existing.headerImageUrl;
      existing.agentImageUrl = data.agentImageUrl !== undefined ? data.agentImageUrl : existing.agentImageUrl;
      existing.bannerImageUrl = data.bannerImageUrl !== undefined ? data.bannerImageUrl : existing.bannerImageUrl;
      existing.primaryColor = data.primaryColor !== undefined ? data.primaryColor : existing.primaryColor;
      existing.widgetCode = data.widgetCode !== undefined ? data.widgetCode : existing.widgetCode;
      return await existing.save();
    } else {
      return await this.create(data);
    }
  }
}

module.exports = ChatbotConfig;

