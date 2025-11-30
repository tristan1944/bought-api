const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ChatbotConfig = require('../models/ChatbotConfig');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/icons';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `icon-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
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

// Get chatbot configuration
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const config = await ChatbotConfig.findByUserId(req.user.id);
    
    if (!config) {
      return res.json({
        iconUrl: null,
        primaryColor: '#667eea',
        widgetCode: generateWidgetCode(req.user.id)
      });
    }

    res.json({
      iconUrl: config.iconUrl,
      primaryColor: config.primaryColor,
      widgetCode: config.widgetCode || generateWidgetCode(req.user.id)
    });
  } catch (error) {
    console.error('Error fetching chatbot config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Update chatbot configuration
router.post('/config', authenticateToken, async (req, res) => {
  try {
    const { primaryColor, widgetCode } = req.body;

    const config = await ChatbotConfig.upsert({
      userId: req.user.id,
      primaryColor: primaryColor,
      widgetCode: widgetCode
    });

    res.json({
      iconUrl: config.iconUrl,
      primaryColor: config.primaryColor,
      widgetCode: config.widgetCode
    });
  } catch (error) {
    console.error('Error updating chatbot config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Upload icon
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

