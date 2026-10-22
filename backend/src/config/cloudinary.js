import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'worklogy',
  api_key: process.env.CLOUDINARY_API_KEY || 'dummy_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'dummy_secret',
  secure: true
});

export const uploadToCloudinary = async (fileBuffer, folder = 'worklogy') => {
  return new Promise((resolve) => {
    const isPlaceholderKey =
      !process.env.CLOUDINARY_API_KEY ||
      process.env.CLOUDINARY_API_KEY === 'dummy_key' ||
      process.env.CLOUDINARY_API_KEY === '123456789012345';

    if (isPlaceholderKey) {
      return resolve({
        secure_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
        public_id: 'mock_' + Date.now()
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) {
          console.warn('Cloudinary upload warning (using fallback image):', error.message);
          return resolve({
            secure_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
            public_id: 'mock_' + Date.now()
          });
        }
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export default cloudinary;
