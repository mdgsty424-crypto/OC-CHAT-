import "./src/lib/sanitize-env.ts";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ZegoCloud Configuration
const ZEGO_APP_ID = Number(process.env.ZEGO_APP_ID) || 1698335343;
const ZEGO_SERVER_SECRET = process.env.ZEGO_SERVER_SECRET || "827755ef5ec4c06648bc783998a6d0c2";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "oc-chat",
    resource_type: "auto",
  } as any,
});

const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Cloudinary Upload
  app.post("/api/upload", upload.single("file"), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ 
      url: req.file.path,
      format: req.file.format,
      resource_type: req.file.resource_type
    });
  });

  // API Route for Zego Token Generation
  app.post("/api/zego/token", (req, res) => {
    const { userId, roomId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    // In a real app, you'd use the Zego Server Assistant SDK
    // For this prototype, we'll generate a secure-looking token
    // that the client can use. Zego's Web SDK usually requires a 
    // token generated with the ServerSecret.
    
    const nonce = crypto.randomBytes(16).toString('hex');
    const expired = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    
    // This is a simplified version of Zego's token generation
    // In production, use the official Zego Server Assistant SDK
    const payload = {
      app_id: ZEGO_APP_ID,
      user_id: userId,
      nonce: nonce,
      expired: expired,
    };

    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    res.json({ token });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
