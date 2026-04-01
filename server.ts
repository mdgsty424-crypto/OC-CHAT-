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
console.log("Cloudinary config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : 'undefined'
});
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global request logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json());

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      cloudinary: !!process.env.CLOUDINARY_API_KEY
    });
  });

  // API Route for Cloudinary Upload
  app.post("/api/upload", (req, res) => {
    console.log("POST /api/upload - Received request");
    
    upload.single("file")(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(500).json({ 
          error: "Upload failed", 
          message: err.message,
          code: (err as any).code
        });
      }
      
      if (!(req as any).file) {
        console.error("No file in request");
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      try {
        console.log("Uploading to Cloudinary manually...", {
          mimetype: (req as any).file.mimetype,
          originalname: (req as any).file.originalname,
          size: (req as any).file.size
        });
        
        const result: any = await new Promise((resolve, reject) => {
          const isAudio = (req as any).file.mimetype.startsWith('audio/') || 
                          (req as any).file.mimetype.startsWith('video/webm') ||
                          (req as any).file.originalname.endsWith('.webm') || 
                          (req as any).file.originalname.endsWith('.mp3');
          
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              folder: "oc-chat", 
              resource_type: isAudio ? "video" : "auto",
              // Force format if we know it's audio to help Cloudinary
              format: isAudio ? "webm" : undefined
            },
            (error, result) => {
              if (error) {
                console.error("Cloudinary upload_stream error callback:", error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          uploadStream.end((req as any).file!.buffer);
        });
        
        console.log("Cloudinary upload success:", result.secure_url);
        res.json({ 
          url: result.secure_url,
          resource_type: result.resource_type,
          format: result.format
        });
      } catch (uploadErr: any) {
        console.error("Cloudinary upload error:", uploadErr);
        res.status(500).json({ 
          error: "Cloudinary upload failed", 
          message: uploadErr.message 
        });
      }
    });
  });

  // API Route for Zego Token Generation
  app.post("/api/zego/token", (req, res) => {
    const { userId, roomId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    // Zego Token Generation (Simplified but more realistic)
    const nonce = crypto.randomBytes(16).toString('hex');
    const expired = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    
    // In a real app, use Zego's official Server Assistant SDK
    // This is a placeholder that simulates the structure
    const tokenPayload = {
      app_id: ZEGO_APP_ID,
      user_id: userId,
      nonce: nonce,
      expired: expired,
      room_id: roomId || "",
      privilege: {
        1: 1, // login
        2: 1  // publish
      }
    };

    // For the prototype, we'll return a base64 encoded JSON string
    // Note: The real Zego SDK expects a specific binary format signed with HMAC-SHA256
    // If the Zego SDK fails with this token, we might need to use a simpler "test" token
    // or the user might need to provide a real token generation service.
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    
    res.json({ token });
  });

  // API Route for Link Preview
  app.get("/api/link-preview", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      console.log("Fetching link preview for:", url);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        }
      });
      const html = await response.text();

      const getMeta = (name: string) => {
        const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
        const match = html.match(regex);
        if (match) return match[1];
        
        const altRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i');
        const altMatch = html.match(altRegex);
        return altMatch ? altMatch[1] : null;
      };

      const title = getMeta('og:title') || getMeta('title') || html.match(/<title>([^<]+)<\/title>/i)?.[1];
      const description = getMeta('og:description') || getMeta('description');
      const image = getMeta('og:image');
      const siteName = getMeta('og:site_name');

      res.json({
        title: title || url,
        description: description || "",
        image: image || "",
        siteName: siteName || new URL(url).hostname,
        url
      });
    } catch (error) {
      console.error("Link preview error:", error);
      res.status(500).json({ error: "Failed to fetch link preview" });
    }
  });

  app.post('*', (req, res) => {
    console.log("POST request to unknown route:", req.path);
    res.status(404).json({ error: "Not found" });
  });

  // Global error handler to ensure JSON responses
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    res.status(err.status || 500).json({ 
      error: "Internal server error", 
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
