const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary with env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Storage for Part images ───────────────────────────────────
const partsStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'autoparts/parts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
  },
});

// ─── Storage for Part Request photos ──────────────────────────
const requestsStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'autoparts/requests',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation:  [{ width: 1200, quality: 'auto' }],
  },
});

const uploadPart     = multer({ storage: partsStorage,    limits: { fileSize: 5 * 1024 * 1024 } });
const uploadRequest  = multer({ storage: requestsStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Helper — delete image from Cloudinary by publicId
async function deleteCloudinaryImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
}

module.exports = { uploadPart, uploadRequest, deleteCloudinaryImage, cloudinary };
