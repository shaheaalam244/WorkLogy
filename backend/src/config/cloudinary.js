import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwbmafbyx',
  api_key: process.env.CLOUDINARY_API_KEY || '297118518981751',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'eph9n1NXlrk1dAVqErCpSO7wU7Q',
  secure: true
});

export const uploadToCloudinary = async (fileBuffer, folder = 'worklogy', options = {}) => {
  return new Promise((resolve, reject) => {
    // 1. Primary path: Stream upload directly to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (!error && result?.secure_url) {
          return resolve({
            secure_url: result.secure_url,
            public_id: result.public_id
          });
        }

        console.warn('Cloudinary upload warning, saving file to local storage:', error?.message);

        // 2. Resilient Fallback: Save the EXACT customer file buffer to local disk
        try {
          const extension = options.extension || 'jpg';
          const filename = `${folder.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
          const filePath = path.join(UPLOADS_DIR, filename);

          fs.writeFileSync(filePath, fileBuffer);

          const host = options.reqHost || process.env.BACKEND_HOST || '76.13.246.224:5001';
          const protocol = options.reqProtocol || 'http';
          const localUrl = `${protocol}://${host}/uploads/${filename}`;

          resolve({
            secure_url: localUrl,
            public_id: 'local_' + Date.now()
          });
        } catch (localErr) {
          console.error('Local file save failed:', localErr);
          reject(error || localErr);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export default cloudinary;
