import dotenv from "dotenv";
dotenv.config();

if (process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_URL.startsWith('cloudinary://')) {
  delete process.env.CLOUDINARY_URL;
}
