import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

// uploading file in the cloudinary
const uploadOnCloudniary = async (localFilePath) => {
  try {
    // check if the file is in the local space
    if (!localFilePath) return "File is not on local space";

    // upload the file now
    const uploadFile = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);
    return uploadFile;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locally saved temp file as the operation failed
    return null;
  }
};

export { uploadOnCloudniary };
