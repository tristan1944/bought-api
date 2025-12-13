const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

function parseSqliteDateToMs(sqliteDate) {
  if (!sqliteDate) return null;
  // SQLite CURRENT_TIMESTAMP format: "YYYY-MM-DD HH:MM:SS"
  const iso = String(sqliteDate).replace(' ', 'T') + 'Z';
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function buildTrialStatus(userRow) {
  const startedMs = parseSqliteDateToMs(userRow.trial_started_at);
  const expiresMs = parseSqliteDateToMs(userRow.trial_expires_at);
  const used = Boolean(startedMs);
  const now = Date.now();
  const active = Boolean(expiresMs && now < expiresMs);
  const expired = Boolean(expiresMs && now >= expiresMs);

  return {
    used,
    active,
    expired,
    startedAt: startedMs ? new Date(startedMs).toISOString() : null,
    expiresAt: expiresMs ? new Date(expiresMs).toISOString() : null,
  };
}

// Start 7-day free trial (one-time per user)
router.post('/start-trial', authenticateToken, async (req, res) => {
  try {
    const database = db.getDB();
    const userId = req.user.id || req.user._id;

    const userRow = database.prepare(
      `SELECT id, email, price_plan, trial_started_at, trial_expires_at
       FROM users
       WHERE id = ?`
    ).get(userId);

    if (!userRow) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user is on a paid plan, trial isn't applicable.
    if (userRow.price_plan) {
      return res.status(403).json({ error: 'Trial is not available for paid accounts.' });
    }

    const trial = buildTrialStatus(userRow);

    // Trial can only be started once. If used already, lock it.
    if (trial.used) {
      return res.status(403).json({
        error: trial.expired ? 'Your 7-day free trial has expired.' : 'Your 7-day free trial is already active.',
        trial,
      });
    }

    // Start trial
    database.prepare(
      `UPDATE users
       SET trial_started_at = CURRENT_TIMESTAMP,
           trial_expires_at = datetime('now', '+7 days')
       WHERE id = ?`
    ).run(userId);

    const updated = database.prepare(
      `SELECT id, email, price_plan, trial_started_at, trial_expires_at
       FROM users
       WHERE id = ?`
    ).get(userId);

    const updatedTrial = buildTrialStatus(updated);

    // Sync credentials via admin-api (assigns a free-trial credential in pending_customization)
    const adminApiUrl = process.env.ADMIN_API_URL || 'http://localhost:3001';
    try {
      const syncResponse = await fetch(`${adminApiUrl}/api/plans/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: updated.email,
          plan_type: 'free-trial',
          is_plan_change: true,
        }),
      });

      if (!syncResponse.ok) {
        const errorText = await syncResponse.text();
        console.warn('[Trial] Admin API sync failed:', syncResponse.status, errorText);
      }
    } catch (syncError) {
      console.warn('[Trial] Admin API sync error:', syncError.message);
    }

    return res.json({
      success: true,
      planId: 'trial',
      trial: updatedTrial,
      message: '7-day free trial activated.',
    });
  } catch (error) {
    console.error('Start trial error:', error);
    return res.status(500).json({ error: error.message || 'Failed to start trial' });
  }
});

module.exports = router;


