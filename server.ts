import "./src/lib/sanitize-env.ts";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
import { db } from "./src/lib/firebase.ts";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  doc,
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ZegoCloud Configuration
const ZEGO_APP_ID = Number(process.env.ZEGO_APP_ID) || 1698335343;
const ZEGO_SERVER_SECRET = process.env.ZEGO_SERVER_SECRET || "827755ef5ec4c06648bc783998a6d0c2";

// webtoapp.design Configuration
const WEBTOAPP_API_KEY = process.env.WEBTOAPP_API_KEY || "tFT_Zi9r8SEvbduQ3jRhMhRN73-raDOy2r-522NuXSc";
const WEBTOAPP_API_URL = `https://webtoapp.design/api/push_notifications?key=${WEBTOAPP_API_KEY}`;

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
                          (req as any).file.originalname.endsWith('.mp3') ||
                          (req as any).file.originalname === 'voice.webm';
          
          const uploadOptions: any = {
            folder: "oc-chat",
            resource_type: "auto",
          };

          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
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

  // --- Push Notification Endpoints ---

  // 2. Send Push Notification
  app.post("/api/notifications/send", async (req, res) => {
    const { targetUserId, title, message, image, link, priority, sound, requireInteraction, actions } = req.body;
    
    if (!targetUserId || !title || !message) {
      return res.status(400).json({ error: "targetUserId, title, and message are required" });
    }

    try {
      // Handle Global Broadcast
      let targetUserIds: string[] = [];
      if (targetUserId === 'all') {
        const usersSnap = await getDocs(collection(db, "users"));
        targetUserIds = usersSnap.docs.map(doc => doc.id);
      } else {
        targetUserIds = [targetUserId];
      }

      console.log(`Sending notification to ${targetUserIds.length} users: ${title}`);

      // If OneSignal REST API Key is available, use OneSignal
      if (process.env.ONESIGNAL_REST_API_KEY) {
        const payload: any = {
          app_id: "77b000e4-b044-4010-ac1e-9e73704baefa",
          target_channel: "push",
          headings: { en: title },
          contents: { en: message },
        };

        if (targetUserId === 'all') {
          payload.included_segments = ["All"];
        } else {
          payload.include_aliases = {
            external_id: targetUserIds
          };
        }

        if (image) payload.big_picture = image;
        if (link) payload.url = link;
        if (actions) {
          payload.buttons = actions.map((a: any) => ({
            id: a.action,
            text: a.title,
            url: a.url
          }));
        }

        const response = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
          console.error(`OneSignal API Error: ${JSON.stringify(data)}`);
          return res.status(response.status).json({ error: "Failed to send notification via OneSignal", details: data });
        }

        return res.json({ success: true, data });
      }

      // Fallback to webtoapp.design for each user
      let totalSent = 0;
      for (const uid of targetUserIds) {
        const q = query(collection(db, "user_tokens"), where("userId", "==", uid));
        const querySnapshot = await getDocs(q);
        const tokens = querySnapshot.docs.map(doc => doc.data().token);

        if (tokens.length === 0) continue;

        await Promise.all(tokens.map(async (token) => {
          const payload: any = {
            token: token,
            title: title,
            message: message
          };

          if (image) payload.image_url = image;
          if (link) payload.url_to_open = link;
          if (actions) payload.actions = actions;

          await fetch(WEBTOAPP_API_URL, {
            method: "POST",
            headers: { 
              "accept": "application/json",
              "content-type": "application/json" 
            },
            body: JSON.stringify(payload)
          });
          totalSent++;
        }));
      }

      res.json({ success: true, sent: totalSent });
    } catch (error: any) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification", message: error.message });
    }
  });

  // API Route for Link Preview
  app.get("/api/fetch-preview", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      console.log("Fetching link preview for:", url);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000
      });
      
      const html = response.data;
      const $ = cheerio.load(html);

      const getMeta = (name: string) => {
        return $(`meta[property="${name}"]`).attr('content') || 
               $(`meta[name="${name}"]`).attr('content') || 
               $(`meta[property="twitter:${name.replace('og:', '')}"]`).attr('content') ||
               $(`meta[name="twitter:${name.replace('og:', '')}"]`).attr('content');
      };

      const title = getMeta('og:title') || getMeta('title') || $('title').text();
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
    } catch (error: any) {
      console.error("Link preview error:", error.message || "Unknown error");
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
