const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ChatbotConfig = require('../models/ChatbotConfig');
const { authenticateToken } = require('../middleware/auth');

function parseSqliteDateToMs(sqliteDate) {
  if (!sqliteDate) return null;
  // SQLite CURRENT_TIMESTAMP format: "YYYY-MM-DD HH:MM:SS"
  const iso = String(sqliteDate).replace(' ', 'T') + 'Z';
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function effectivePlanId(user) {
  const paid = user && user.pricePlan ? String(user.pricePlan) : null;
  if (paid) return paid;

  const expiresMs = parseSqliteDateToMs(user && user.trialExpiresAt);
  const activeTrial = Boolean(expiresMs && Date.now() < expiresMs);
  return activeTrial ? 'trial' : null;
}

function mapBoughtPlanToAdminPlanType(planId) {
  // bought-api uses plan1/plan2/plan3 (paid) and 'trial' (computed) internally.
  // admin-api uses plan_type values like starter/essential/pro + free-trial.
  switch (planId) {
    case 'plan1':
      return 'starter-monthly';
    case 'plan2':
      return 'essential-monthly';
    case 'plan3':
      return 'pro-monthly';
    case 'trial':
      return 'free-trial';
    default:
      return null;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  return { ok: response.ok, status: response.status, data, text };
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadDir = 'public/uploads/icons';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      // Use a fallback if user is not set (shouldn't happen with auth middleware, but safer)
      const userId = (req.user && (req.user.id || req.user._id)) || 'anonymous';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `icon-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    } catch (error) {
      cb(error);
    }
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get chatbot configuration (public endpoint for widget)
router.get('/widget-config/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const config = await ChatbotConfig.findByUserId(userId);
    
    if (!config) {
      return res.json({
        iconUrl: null,
        headerImageUrl: null,
        agentImageUrl: null,
        bannerImageUrl: null,
        bannerHeader: 'Your AI agent',
        bannerDescription: 'How can I help you today?',
        primaryColor: '#667eea'
      });
    }

    res.json({
      iconUrl: config.iconUrl,
      headerImageUrl: config.headerImageUrl,
      agentImageUrl: config.agentImageUrl,
      bannerImageUrl: config.bannerImageUrl,
      bannerHeader: 'Your AI agent',
      bannerDescription: 'How can I help you today?',
      primaryColor: config.primaryColor || '#667eea'
    });
  } catch (error) {
    console.error('Error fetching widget config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Get chatbot configuration
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const config = await ChatbotConfig.findByUserId(req.user.id);
    
    if (!config) {
      return res.json({
        iconUrl: null,
        headerImageUrl: null,
        agentImageUrl: null,
        bannerImageUrl: null,
        primaryColor: '#667eea',
        widgetCode: generateWidgetCode(req.user.id)
      });
    }

    res.json({
      iconUrl: config.iconUrl,
      headerImageUrl: config.headerImageUrl,
      agentImageUrl: config.agentImageUrl,
      bannerImageUrl: config.bannerImageUrl,
      primaryColor: config.primaryColor,
      widgetCode: config.widgetCode || generateWidgetCode(req.user.id)
    });
  } catch (error) {
    console.error('Error fetching chatbot config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Get the correct website embed snippet for the authenticated user.
// This proxies admin-api's snippet generator so the frontend doesn't need direct access to admin-api.
router.get('/snippet', authenticateToken, async (req, res) => {
  try {
    const adminApiUrl = process.env.ADMIN_API_URL || 'http://localhost:3001';
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).json({ error: 'User email not found. Please log in again.' });
    }

    // Optional query passthroughs (mostly for debugging)
    const params = new URLSearchParams();
    const passthroughKeys = ['unique_id', 'uniqueId', 'navApiUrl', 'navEventsPath', 'versionID', 'userID'];
    for (const key of passthroughKeys) {
      const value = req.query[key];
      if (typeof value === 'string' && value.trim()) {
        params.set(key, value.trim());
      }
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    const upstreamUrl = `${adminApiUrl}/api/users/${encodeURIComponent(userEmail)}/snippet${qs}`;
    let result = await fetchJson(upstreamUrl);

    // Smooth onboarding: if admin-api doesn't know this user yet (or doesn't have credentials yet),
    // try provisioning via /api/plans/sync using the buyer's plan/trial, then retry.
    if (!result.ok && (result.status === 404 || result.status === 409)) {
      const planId = effectivePlanId(req.user);
      const planType = mapBoughtPlanToAdminPlanType(planId);

      if (!planType) {
        return res.status(402).json({
          error: 'No active plan found for your account yet.',
          details: 'Purchase a plan (or start a trial) to generate your integration snippet.',
        });
      }

      const sync = await fetchJson(`${adminApiUrl}/api/plans/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          plan_type: planType,
          is_plan_change: true,
        }),
      });

      if (!sync.ok) {
        return res.status(sync.status).json({
          error: sync.data?.error || 'Failed to provision credentials for your account.',
          details: sync.data?.details || sync.text || undefined,
        });
      }

      // Retry snippet fetch after provisioning
      result = await fetchJson(upstreamUrl);
    }

    if (!result.ok) {
      return res.status(result.status).json({
        error: (result.data && (result.data.error || result.data.message)) || 'Failed to fetch snippet from admin-api',
        details: (result.data && result.data.details) || result.text || undefined,
      });
    }

    return res.json({
      snippet: result.data?.snippet || '',
      meta: result.data?.meta || null,
      customization: result.data?.customization || null,
    });
  } catch (error) {
    console.error('Error fetching snippet from admin-api:', error);
    return res.status(503).json({
      error: 'Snippet service unavailable',
      details: 'Make sure ADMIN_API_URL is set and admin-api is running.',
    });
  }
});

// Update chatbot configuration
router.post('/config', authenticateToken, async (req, res) => {
  try {
    const { primaryColor, widgetCode, headerImageUrl, agentImageUrl, bannerImageUrl } = req.body;

    const config = await ChatbotConfig.upsert({
      userId: req.user.id,
      primaryColor: primaryColor,
      widgetCode: widgetCode,
      headerImageUrl: headerImageUrl,
      agentImageUrl: agentImageUrl,
      bannerImageUrl: bannerImageUrl
    });

    res.json({
      iconUrl: config.iconUrl,
      headerImageUrl: config.headerImageUrl,
      agentImageUrl: config.agentImageUrl,
      bannerImageUrl: config.bannerImageUrl,
      primaryColor: config.primaryColor,
      widgetCode: config.widgetCode
    });
  } catch (error) {
    console.error('Error updating chatbot config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Upload icon (launcher icon)
router.post('/upload-icon', authenticateToken, upload.single('icon'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const iconUrl = `/uploads/icons/${req.file.filename}`;

    const config = await ChatbotConfig.upsert({
      userId: req.user.id,
      iconUrl: iconUrl
    });

    res.json({
      iconUrl: config.iconUrl,
      message: 'Icon uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading icon:', error);
    res.status(500).json({ error: 'Failed to upload icon' });
  }
});

// Upload header image
router.post('/upload-header-image', authenticateToken, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const imageUrl = `/uploads/icons/${req.file.filename}`;

    const config = await ChatbotConfig.upsert({
      userId: req.user.id,
      headerImageUrl: imageUrl
    });

    res.json({
      headerImageUrl: config.headerImageUrl,
      message: 'Header image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading header image:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to upload header image', details: error.message });
  }
});

// Upload agent image
router.post('/upload-agent-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/icons/${req.file.filename}`;

    const config = await ChatbotConfig.upsert({
      userId: req.user.id,
      agentImageUrl: imageUrl
    });

    res.json({
      agentImageUrl: config.agentImageUrl,
      message: 'Agent image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading agent image:', error);
    res.status(500).json({ error: 'Failed to upload agent image' });
  }
});

// Upload banner image
router.post('/upload-banner-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/icons/${req.file.filename}`;

    const config = await ChatbotConfig.upsert({
      userId: req.user.id,
      bannerImageUrl: imageUrl
    });

    res.json({
      bannerImageUrl: config.bannerImageUrl,
      message: 'Banner image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading banner image:', error);
    res.status(500).json({ error: 'Failed to upload banner image' });
  }
});

// Get provider information
router.get('/providers', (req, res) => {
  const providers = [
    {
      name: 'WordPress',
      icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/wordpress.svg',
      blogUrl: '/blog/wordpress-integration'
    },
    {
      name: 'Shopify',
      icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/shopify.svg',
      blogUrl: '/blog/shopify-integration'
    },
    {
      name: 'Wix',
      icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/wix.svg',
      blogUrl: '/blog/wix-integration'
    },
    {
      name: 'Squarespace',
      icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/squarespace.svg',
      blogUrl: '/blog/squarespace-integration'
    },
    {
      name: 'Webflow',
      icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/webflow.svg',
      blogUrl: '/blog/webflow-integration'
    },
    {
      name: 'HTML',
      icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/html5.svg',
      blogUrl: '/blog/html-integration'
    },
    {
      name: 'React',
      icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/react.svg',
      blogUrl: '/blog/react-integration'
    },
    {
      name: 'Vue',
      icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/vuedotjs.svg',
      blogUrl: '/blog/vue-integration'
    }
  ];

  const searchQuery = req.query.q?.toLowerCase() || '';
  const filtered = providers.filter(p => 
    p.name.toLowerCase().includes(searchQuery)
  );

  res.json(filtered);
});

function generateWidgetCode(userId) {
  return `<script>
  (function() {
    var chatbot = document.createElement('div');
    chatbot.id = 'ai-chatbot-widget';
    chatbot.setAttribute('data-user-id', '${userId}');
    document.body.appendChild(chatbot);
    
    var script = document.createElement('script');
    script.src = '${process.env.FRONTEND_URL || 'https://bought-api.onrender.com'}/widget.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
}

module.exports = router;

