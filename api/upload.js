import { IncomingForm } from 'formidable';
import { v2 as cloudinary } from 'cloudinary';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
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
    res.status(500).json({
      success: false,
      error: 'Failed to upload photos',
      details: error.message
    });
  }
}
