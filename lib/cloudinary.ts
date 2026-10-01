import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadAvatarToCloudinary(
  fileBufferOrBase64: Buffer | string,
  userId: string
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: 'shared-ledger/avatars',
      public_id: `user_${userId}_${Date.now()}`,
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    };

    if (typeof fileBufferOrBase64 === 'string') {
      cloudinary.uploader.upload(fileBufferOrBase64, uploadOptions, (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload failed'));
        } else {
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      });
    } else {
      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload failed'));
        } else {
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      });
      uploadStream.end(fileBufferOrBase64);
    }
  });
}

export async function deleteAvatarFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to delete avatar from Cloudinary:', err);
  }
}

export default cloudinary;
