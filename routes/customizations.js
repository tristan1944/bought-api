const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads (kept for future multipart support)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadDir = 'public/uploads/customizations';
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
      const userId = (req.user && (req.user.id || req.user._id)) || 'anonymous';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    } catch (error) {
      cb(error);
    }
  },
});

// eslint-disable-next-line no-unused-vars
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Helper function to save base64 image to file
function saveBase64Image(base64Data, userId, imageType) {
  if (!base64Data || typeof base64Data !== 'string' || !base64Data.startsWith('data:image')) {
    return null;
  }

  try {
    const uploadDir = 'public/uploads/customizations';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Extract image format and data
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return null;
    }

    const ext = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    const filename = `${userId}-${imageType}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    fs.writeFileSync(filepath, buffer);
    return `/uploads/customizations/${filename}`;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    return null;
  }
}

function mapPricePlanToAdminPlanType(pricePlan) {
  if (!pricePlan) return null;

  // bought-api uses plan1/plan2/plan3 internally.
  // admin-api uses starter/essential/pro plan types.
  switch (pricePlan) {
    case 'plan1':
      return 'starter-monthly';
    case 'plan2':
      return 'essential-monthly';
    case 'plan3':
      return 'pro-monthly';
    default:
      return null;
  }
}

function toAbsoluteUrl(baseUrl, maybePathOrUrl) {
  if (!maybePathOrUrl || typeof maybePathOrUrl !== 'string') return null;
  if (maybePathOrUrl.startsWith('http://') || maybePathOrUrl.startsWith('https://')) return maybePathOrUrl;
  if (maybePathOrUrl.startsWith('/')) return `${baseUrl}${maybePathOrUrl}`;
  return `${baseUrl}/${maybePathOrUrl}`;
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

async function getAdminUserByEmail(adminApiUrl, userEmail) {
  const result = await fetchJson(`${adminApiUrl}/api/users/${encodeURIComponent(userEmail)}`);
  if (!result.ok) return null;
  return result.data;
}

async function findCredentialIdForUser(adminApiUrl, userEmail) {
  const adminUser = await getAdminUserByEmail(adminApiUrl, userEmail);
  if (!adminUser || !adminUser.project_id || !adminUser.vf_api_key) {
    return { credentialId: null, adminUser };
  }

  const credResult = await fetchJson(`${adminApiUrl}/api/credentials`);
  if (!credResult.ok || !Array.isArray(credResult.data)) {
    return { credentialId: null, adminUser };
  }

  const matchingCred = credResult.data.find(
    (cred) => cred.project_id === adminUser.project_id && cred.vf_api_key === adminUser.vf_api_key
  );

  return { credentialId: matchingCred ? matchingCred.id : null, adminUser };
}

async function provisionAdminCredential(adminApiUrl, userEmail, planType) {
  const syncResult = await fetchJson(`${adminApiUrl}/api/plans/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      plan_type: planType,
      // Force pending_customization so it appears in the "Pending Customization" pool
      is_plan_change: true,
    }),
  });

  if (!syncResult.ok) {
    const msg =
      (syncResult.data && (syncResult.data.error || syncResult.data.details)) ||
      `Admin API sync failed (status ${syncResult.status})`;
    const err = new Error(msg);
    err.status = syncResult.status;
    throw err;
  }

  return {
    adminUser: syncResult.data?.user || null,
    credentialId: syncResult.data?.credential_id || null,
  };
}

async function resolveCredentialForUser(adminApiUrl, userEmail, pricePlan) {
  const planType = mapPricePlanToAdminPlanType(pricePlan);
  if (!planType) {
    const err = new Error(
      'No active plan found for your account. Please purchase a plan before saving/finalizing customizations.'
    );
    err.status = 402;
    throw err;
  }

  const found = await findCredentialIdForUser(adminApiUrl, userEmail);
  if (found.credentialId) {
    return found;
  }

  const provisioned = await provisionAdminCredential(adminApiUrl, userEmail, planType);
  return { credentialId: provisioned.credentialId, adminUser: provisioned.adminUser || found.adminUser };
}

// Save customization to admin-api
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { primaryColor, agentAvatar, headerImage, popupImage, bannerImage } = req.body || {};
    const userEmail = req.user.email;
    const userId = req.user.id;
    const adminApiUrl = process.env.ADMIN_API_URL || 'http://localhost:3001';
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (!primaryColor) {
      return res.status(400).json({ error: 'Primary color is required' });
    }

    let credentialId = null;
    try {
      const resolved = await resolveCredentialForUser(adminApiUrl, userEmail, req.user.pricePlan);
      credentialId = resolved.credentialId;
    } catch (err) {
      const isPlanError = err.status === 402;
      const status = isPlanError ? 402 : 503;
      return res.status(status).json({
        error: err.message || 'Unable to prepare your customization request.',
        details: isPlanError
          ? undefined
          : 'Make sure the admin-api is running and has available credentials for your plan.',
      });
    }

    if (!credentialId) {
      return res.status(503).json({
        error: 'Could not resolve a credential for your account. Please try again later.',
      });
    }

    // Save images from base64 to files
    let agentImagePath = null;
    let headerImagePath = null;
    let popupImagePath = null;
    let bannerImagePath = null;

    if (agentAvatar && typeof agentAvatar === 'string' && agentAvatar.startsWith('data:image')) {
      agentImagePath = saveBase64Image(agentAvatar, userId, 'agent');
    } else if (agentAvatar && typeof agentAvatar === 'string') {
      agentImagePath = agentAvatar;
    }

    if (headerImage && typeof headerImage === 'string' && headerImage.startsWith('data:image')) {
      headerImagePath = saveBase64Image(headerImage, userId, 'header');
    } else if (headerImage && typeof headerImage === 'string') {
      headerImagePath = headerImage;
    }

    if (popupImage && typeof popupImage === 'string' && popupImage.startsWith('data:image')) {
      popupImagePath = saveBase64Image(popupImage, userId, 'popup');
    } else if (popupImage && typeof popupImage === 'string') {
      popupImagePath = popupImage;
    }

    if (bannerImage && typeof bannerImage === 'string' && bannerImage.startsWith('data:image')) {
      bannerImagePath = saveBase64Image(bannerImage, userId, 'banner');
    } else if (bannerImage && typeof bannerImage === 'string') {
      bannerImagePath = bannerImage;
    }

    // Save to admin-api
    const saveResult = await fetchJson(`${adminApiUrl}/api/customizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential_id: credentialId,
        user_email: userEmail,
        primary_color: primaryColor,
        // Store absolute URLs so the uploaded PNG is downloadable from the admin panel
        header_image_path: toAbsoluteUrl(baseUrl, headerImagePath),
        agent_image_path: toAbsoluteUrl(baseUrl, agentImagePath),
        popup_image_path: toAbsoluteUrl(baseUrl, popupImagePath),
        banner_image_path: toAbsoluteUrl(baseUrl, bannerImagePath),
      }),
    });

    if (!saveResult.ok) {
      return res.status(saveResult.status).json({
        error: saveResult.data?.error || 'Failed to save customization',
        details: saveResult.data?.details || saveResult.text,
      });
    }

    res.json({
      success: true,
      customization: saveResult.data?.customization,
      message: saveResult.data?.message || 'Customization saved successfully',
    });
  } catch (error) {
    console.error('Error saving customization:', error);
    res.status(500).json({ error: 'Failed to save customization', details: error.message });
  }
});

// Finalize customization - only works if a non-default color is set and at least one image exists
router.post('/finalize', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const adminApiUrl = process.env.ADMIN_API_URL || 'http://localhost:3001';

    let credentialId = null;
    let adminUser = null;

    try {
      const resolved = await resolveCredentialForUser(adminApiUrl, userEmail, req.user.pricePlan);
      credentialId = resolved.credentialId;
      adminUser = resolved.adminUser;
    } catch (err) {
      const isPlanError = err.status === 402;
      const status = isPlanError ? 402 : 503;
      return res.status(status).json({
        error: err.message || 'Unable to finalize your customization.',
        details: isPlanError
          ? undefined
          : 'Make sure the admin-api is running and has available credentials for your plan.',
      });
    }

    if (!credentialId) {
      return res.status(503).json({
        error: 'Could not resolve a credential for your account. Please try again later.',
      });
    }

    // Server-side enforce the "Done" requirements
    const customizationResult = await fetchJson(`${adminApiUrl}/api/customizations/credential/${credentialId}`);
    if (!customizationResult.ok || !customizationResult.data) {
      return res.status(400).json({
        error: 'Please save your customization (color + image) before clicking Done.',
      });
    }

    const customization = customizationResult.data;
    const DEFAULT_COLOR = '#6366f1';
    const colorCustomized = customization.primary_color && customization.primary_color !== DEFAULT_COLOR;
    const hasImage = !!(
      customization.header_image_path ||
      customization.agent_image_path ||
      customization.popup_image_path ||
      customization.banner_image_path
    );

    if (!colorCustomized || !hasImage) {
      return res.status(400).json({
        error: 'Please customize the color and upload at least one image before finalizing.',
      });
    }

    // Resolve admin user id
    let adminUserId = adminUser?.id || null;
    if (!adminUserId) {
      const fresh = await getAdminUserByEmail(adminApiUrl, userEmail);
      adminUserId = fresh?.id || null;
    }
    if (!adminUserId) {
      return res.status(503).json({ error: 'Unable to resolve admin user for this account.' });
    }

    // Keep credential in pending_customization so admin can review before assigning
    // The customization data (color + images) is already saved via /save endpoint
    // Admin will manually move to 'assigned' after reviewing in the admin panel
    res.json({
      success: true,
      message: 'Customization submitted for admin review',
      credential_id: credentialId,
    });
  } catch (error) {
    console.error('Error finalizing customization:', error);
    res.status(500).json({ error: 'Failed to finalize customization', details: error.message });
  }
});

module.exports = router;

