import "./src/lib/sanitize-env.ts";
import fs from "fs";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import Groq from "groq-sdk";

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
  deleteDoc,
  orderBy,
  limit,
  updateDoc,
  getDoc
} from "firebase/firestore";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ZegoCloud Configuration
const ZEGO_APP_ID = Number(process.env.ZEGO_APP_ID) || 1698335343;
const ZEGO_SERVER_SECRET = process.env.ZEGO_SERVER_SECRET || "d1647c6b9802ed758e1bf148914b80758d5b35061f3e8f76261c6187d55ab9fe";

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

  // Bot metadata injection middleware for social sharing
  const injectBotMetadata = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Discordbot|TelegramBot|Slackbot/i.test(userAgent);
    
    // Paths we want to handle
    const isPost = req.path.startsWith('/post/');
    const isUser = req.path.startsWith('/u/');
    const isReel = req.path.startsWith('/reel/');

    if (!isBot || (!isPost && !isUser && !isReel)) {
      return next();
    }

    console.log(`[BOT] User-Agent: ${userAgent} | URL: ${req.url}`);

    let title = "OC Chat | Connect, Match, Call";
    let description = "Universal super app for connecting with friends, matching, and high-quality calling.";
    let image = "https://occhat.ocsthael.com/favicon.ico";
    const defaultImage = "https://occhat.ocsthael.com/favicon.ico";
    let url = `https://occhat.ocsthael.com${req.path}`;
    let type = "website";
    let videoUrl = "";
    let thumbnailUrl = "";

    const optimizeCloudinary = (mediaUrl: string | undefined): string => {
      if (!mediaUrl) return defaultImage;
      if (mediaUrl.includes('cloudinary.com') && mediaUrl.includes('/upload/')) {
        return mediaUrl.replace('/upload/', '/upload/w_1200,h_630,c_fill/');
      }
      return mediaUrl;
    };

    try {
      if (isPost) {
        const postId = req.path.split('/')[2];
        if (postId) {
          const snap = await getDoc(doc(db, 'books_posts', postId));
          if (snap.exists()) {
            const data = snap.data();
            title = `${data.authorName || 'Someone'} on OC-CHAT`;
            const caption = data.description || data.title || "Check out this post";
            description = `"${caption}" — Check out this post on OC-CHAT, the ultimate super app.`;
            
            // Media detection logic
            const img = data.imageUrl || (data.mediaType === 'image' ? data.mediaUrl : null);
            const vid = data.videoUrl || (data.mediaType === 'video' ? data.mediaUrl : null);
            const thumb = data.thumbnailUrl;

            if (vid) {
              videoUrl = vid;
              thumbnailUrl = thumb || img || defaultImage;
              image = thumbnailUrl;
            } else if (img) {
              image = img;
            } else {
              image = defaultImage;
            }
            type = "article";
          }
        }
      } else if (isUser) {
        const username = req.path.split('/')[2];
        if (username) {
          const q = query(collection(db, 'users'), where('username', '==', username));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            title = `Connect with ${data.displayName || data.fullName || 'a user'} on OC-CHAT`;
            description = `Join ${data.username || 'us'} and millions of others on OC-CHAT.`;
            image = data.photoURL || defaultImage;
            type = "profile";
          }
        }
      } else if (isReel) {
        const reelId = req.path.split('/')[2];
        if (reelId) {
          const snap = await getDoc(doc(db, 'stories', reelId));
          if (snap.exists()) {
            const data = snap.data();
            title = `${data.authorName || 'Someone'} on OC-CHAT`;
            const caption = data.description || "Watch this reel";
            description = `"${caption}" — Watch this reel on OC-CHAT, the ultimate super app.`;
            
            if (data.mediaType === 'video') {
              videoUrl = data.mediaUrl;
              thumbnailUrl = data.thumbnailUrl || defaultImage;
              image = thumbnailUrl;
            } else {
              image = data.mediaUrl || defaultImage;
            }
            type = "video.other";
          }
        }
      }

      const filePath = process.env.NODE_ENV === "production" 
        ? path.join(process.cwd(), 'dist', 'index.html') 
        : path.join(process.cwd(), 'index.html');
      
      const fileExists = await fs.promises.access(filePath).then(() => true).catch(() => false);
      if (!fileExists) return next();

      let html = await fs.promises.readFile(filePath, 'utf8');
      
      const cleanDesc = (description || '').replace(/"/g, '&quot;').replace(/\n/g, ' ');
      const cleanTitle = (title || '').replace(/"/g, '&quot;');

      let metaTags = [
        `<title>${cleanTitle}</title>`,
        `<meta name="description" content="${cleanDesc}" />`,
        `<meta property="og:title" content="${cleanTitle}" />`,
        `<meta property="og:description" content="${cleanDesc}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:type" content="${type}" />`,
        `<meta property="og:site_name" content="OC-CHAT" />`,
        `<meta name="twitter:title" content="${cleanTitle}" />`,
        `<meta name="twitter:description" content="${cleanDesc}" />`
      ];

      if (videoUrl) {
        metaTags.push(`<meta property="og:video" content="${videoUrl}" />`);
        metaTags.push(`<meta property="og:video:type" content="video/mp4" />`);
        metaTags.push(`<meta property="og:image" content="${optimizeCloudinary(thumbnailUrl)}" />`);
        metaTags.push(`<meta name="twitter:card" content="summary_large_image" />`);
        metaTags.push(`<meta name="twitter:image" content="${optimizeCloudinary(thumbnailUrl)}" />`);
      } else {
        metaTags.push(`<meta property="og:image" content="${optimizeCloudinary(image)}" />`);
        metaTags.push(`<meta name="twitter:card" content="summary_large_image" />`);
        metaTags.push(`<meta name="twitter:image" content="${optimizeCloudinary(image)}" />`);
      }

      const tags = metaTags.join('\n');

      html = html.replace('<head>', `<head>${tags}`);
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (err) {
      console.error("Error generating bot metadata:", err);
      return next();
    }
  };

  app.use(injectBotMetadata);

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
          public_id: result.public_id,
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

  // API Route for Cloudinary Deletion
  app.post("/api/delete-media", async (req, res) => {
    const { publicId, resourceType } = req.body;
    if (!publicId) return res.status(400).json({ error: "publicId is required" });

    try {
      console.log(`Deleting from Cloudinary: ${publicId} (${resourceType || 'image'})`);
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType || "image"
      });
      
      if (result.result === 'ok' || result.result === 'not found') {
        res.json({ success: true, result });
      } else {
        console.error("Cloudinary destroy result not ok:", result);
        res.status(500).json({ error: "Failed to delete from Cloudinary", details: result });
      }
    } catch (error: any) {
      console.error("Cloudinary deletion error:", error);
      res.status(500).json({ error: "Cloudinary deletion failed", message: error.message });
    }
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
      const payload: any = {
        app_id: "77b000e4-b044-4010-ac1e-9e73704baefa",
        headings: { en: title },
        contents: { en: message },
        priority: priority === 'high' ? 10 : undefined,
        ttl: priority === 'high' ? 0 : undefined,
      };

      if (targetUserId === 'all') {
        payload.included_segments = ["All"];
        console.log(`[Push] Broadcasting to all users: ${title}`);
      } else {
        // Fetch recipient's OneSignal IDs from Firestore
        const userRef = doc(db, "users", targetUserId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          return res.status(404).json({ error: "Recipient user not found in Firestore" });
        }

        const userData = userDoc.data();
        const subscriptionIds = userData?.onesignalIds || [];

        if (!subscriptionIds || subscriptionIds.length === 0) {
          console.warn(`[Push] No OneSignal Subscription IDs found for user: ${targetUserId}`);
          // Return success true but with a note, to not break the frontend calling logic
          return res.json({ success: false, message: "User has no linked subscription IDs" });
        }

        payload.include_subscription_ids = subscriptionIds;
        console.log(`[Push] Targeting Subscription IDs for ${targetUserId}: ${JSON.stringify(subscriptionIds)}`);
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

      // Standard OneSignal Auth for v2 keys
      const restKey = 'os_v2_app_o6yabzfqirabbla6tzzxas5o7ldepp4fojfurx4zstq3pgj7tdxjny7nqrihlrb5x2yftdmwy6dlddcedxwbtumeioxyxghvhsemgvy';

      const response = await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers: { 
          'Authorization': 'key ' + restKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("[Push] OneSignal returned non-JSON:", responseText.substring(0, 100));
        return res.status(500).json({ error: "OneSignal invalid response", details: responseText });
      }

      console.log("[Push] OneSignal HTTP Status:", response.status, JSON.stringify(data));

      if (!response.ok) {
        return res.status(response.status).json({ error: "OneSignal Error", details: data });
      }

      return res.json({ success: true, data });

    } catch (error: any) {
      console.error("[Push] Internal Error:", error);
      return res.status(500).json({ error: "Failed to send notification", message: error.message });
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
        timeout: 10000
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

  // API Route for AI Chat
  app.post("/api/ai", async (req, res) => {
    const { chatId, prompt } = req.body;
    if (!chatId || !prompt) return res.status(400).json({ error: "chatId and prompt are required" });

    try {
      // 1. Set typing status
      await updateDoc(doc(db, 'chats', chatId), {
        [`typing.ocsthael-ai-bot`]: true
      });

      // 2. Fetch last 5 messages for context
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(5));
      const snapshot = await getDocs(q);
      const contextMessages = snapshot.docs.map(doc => doc.data().text).reverse();

      // 3. Check for image generation
      if (prompt.toLowerCase().includes('make a photo') || prompt.toLowerCase().includes('generate image')) {
        const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}`;
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          senderId: 'ocsthael-ai-bot',
          text: `Here is your image: ${imageUrl}`,
          type: 'text',
          timestamp: new Date().toISOString(),
          status: 'sent'
        });
        await updateDoc(doc(db, 'chats', chatId), {
          [`typing.ocsthael-ai-bot`]: false
        });
        return res.json({ response: `Here is your image: ${imageUrl}`, imageUrl });
      }

      // 4. Groq API call
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: 'You are the OCSTHAEL Assistant, a helpful and witty AI for the OCSTHAEL Super App ecosystem in Bangladesh.' },
          ...contextMessages.map(text => ({ role: "user" as const, content: text })),
          { role: "user", content: prompt }
        ],
        model: "llama3-8b-8192",
      });

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        senderId: 'ocsthael-ai-bot',
        text: chatCompletion.choices[0]?.message?.content,
        type: 'text',
        timestamp: new Date().toISOString(),
        status: 'sent'
      });

      await updateDoc(doc(db, 'chats', chatId), {
        [`typing.ocsthael-ai-bot`]: false
      });

      res.json({ response: chatCompletion.choices[0]?.message?.content });
    } catch (error: any) {
      console.error("AI Chat error:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  // API Route for Offline Calling via Infobip
  app.post("/api/make-call", async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: "phoneNumber is required" });

    try {
      const INFOBIP_API_KEY = "701772971eb6b9d02482ba463bcfee11-01637336-f610-4a65-9947-ee8ae793983b";
      const INFOBIP_BASE_URL = "https://9jjgy3.api.infobip.com";

      const payload = {
        messages: [
          {
            from: "447491163443", // Example sender ID or number
            destinations: [
              {
                to: phoneNumber
              }
            ],
            text: "Hello! This is a call from OC-CHAT. Someone is trying to reach you.",
            language: "en",
            voice: {
              name: "Joanna",
              gender: "female"
            }
          }
        ]
      };

      const response = await axios.post(`${INFOBIP_BASE_URL}/tts/3/advanced`, payload, {
        headers: {
          'Authorization': `App ${INFOBIP_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("Infobip API error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to initiate call", details: error.response?.data || error.message });
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
