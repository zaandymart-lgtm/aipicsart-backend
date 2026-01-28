import { IncomingForm } from 'formidable';
import { v2 as cloudinary } from 'cloudinary';

// CONFIGURACIÓN DE CLOUDINARY - ¡AÑADE ESTO!
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://aipicsart.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  
  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm();
    form.maxFileSize = 10 * 1024 * 1024; // 10MB max
    form.multiples = true;

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const photos = files.photos || [];
    
    // Verificar si hay fotos
    if (photos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No photos uploaded',
        details: 'Please select at least one photo'
      });
    }

    const uploadedUrls = [];

    // Upload each photo to Cloudinary
    for (const photo of photos.slice(0, 5)) {
      const result = await cloudinary.uploader.upload(photo.filepath, {
        folder: 'aipicsart-uploads',
        transformation: [
          { width: 800, height: 800, crop: 'fill' },
          { quality: 'auto' }
        ]
      });
      uploadedUrls.push(result.secure_url);
    }

    res.status(200).json({
      success: true,
      message: `${uploadedUrls.length} photos uploaded successfully`,
      photo_urls: uploadedUrls,
      count: uploadedUrls.length
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Mejores mensajes de error
    let errorMessage = 'Failed to upload photos';
    if (error.message.includes('CLOUDINARY')) {
      errorMessage = 'Cloudinary configuration error';
    } else if (error.message.includes('file size')) {
      errorMessage = 'File too large';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message
    });
  }
}
