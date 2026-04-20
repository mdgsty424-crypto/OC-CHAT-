import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Initialize Firebase for the serverless function
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig;
try {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error("Failed to read firebase config", e);
}

const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)") : null;

export default async function handler(req, res) {
  let { type, id } = req.query;
  // If type is missing, try to infer or default to post
  if (!type) type = 'post';
  
  const userAgent = req.headers['user-agent'] || '';
  const isBot = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Discordbot|TelegramBot|Slackbot|bot|crawler|spider/i.test(userAgent);

  const defaultTitle = "OC Chat | Connect, Match, Call";
  const defaultDesc = "Universal super app for connecting with friends, matching, and high-quality calling.";
  const defaultImage = "https://occhat.ocsthael.com/favicon.ico";
  const domain = "https://occhat.ocsthael.com";

  // If not a bot and not db, or if it's a human, just serve the app
  if (!isBot || !db) {
    try {
      const indexPath = path.join(process.cwd(), 'dist', 'index.html');
      const devIndexPath = path.join(process.cwd(), 'index.html');
      const htmlPath = fs.existsSync(indexPath) ? indexPath : devIndexPath;
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (e) {
      // Minimal SPA shell as fallback
      return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${defaultTitle}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`);
    }
  }

  let title = defaultTitle;
  let description = defaultDesc;
  let image = defaultImage;
  let url = `${domain}/${type}/${id}`;
  let ogType = "website";
  let videoUrl = "";
  let thumbnailUrl = "";

  const optimizeCloudinary = (mediaUrl) => {
    if (!mediaUrl) return defaultImage;
    if (mediaUrl.includes('cloudinary.com') && mediaUrl.includes('/upload/')) {
      return mediaUrl.replace('/upload/', '/upload/c_fill,w_1200,h_630/');
    }
    return mediaUrl;
  };

  try {
    if (type === 'post') {
      const snap = await getDoc(doc(db, 'books_posts', id));
      if (snap.exists()) {
        const data = snap.data();
        title = `${data.authorName || 'Someone'} on OC-CHAT`;
        const caption = data.description || data.title || "Check out this post";
        description = `"${caption}" — Check out this post on OC-CHAT, the ultimate super app.`;
        
        const img = data.imageUrl || (data.mediaType === 'image' ? data.mediaUrl : null);
        const vid = data.videoUrl || (data.mediaType === 'video' ? data.mediaUrl : null);
        if (vid) {
          videoUrl = vid;
          thumbnailUrl = data.thumbnailUrl || img || defaultImage;
          image = thumbnailUrl;
        } else {
          image = img || defaultImage;
        }
        ogType = "article";
      }
    } else if (type === 'u') {
      const q = query(collection(db, 'users'), where('username', '==', id));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        title = `Connect with ${data.displayName || data.fullName || 'a user'} on OC-CHAT`;
        description = `Join ${data.username || 'us'} and millions of others on OC-CHAT.`;
        image = data.photoURL || defaultImage;
        ogType = "profile";
      }
    } else if (type === 'reel') {
      const snap = await getDoc(doc(db, 'stories', id));
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
        ogType = "video.other";
      }
    }

    const cleanDesc = (description || '').replace(/"/g, '&quot;').replace(/\n/g, ' ');
    const cleanTitle = (title || '').replace(/"/g, '&quot;');
    const version = Date.now();
    const optimizedImage = `${optimizeCloudinary(image)}?v=${version}`;
    const optimizedThumb = `${optimizeCloudinary(thumbnailUrl)}?v=${version}`;
    const fallbackImg = `${defaultImage}?v=${version}`;

    let metaTags = [
      `<title>${cleanTitle}</title>`,
      `<meta name="description" content="${cleanDesc}" />`,
      `<meta property="og:title" content="${cleanTitle}" />`,
      `<meta property="og:description" content="${cleanDesc}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:type" content="${ogType}" />`,
      `<meta property="og:site_name" content="OC-CHAT" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta name="twitter:title" content="${cleanTitle}" />`,
      `<meta name="twitter:description" content="${cleanDesc}" />`
    ];

    if (process.env.FB_APP_ID) {
      metaTags.push(`<meta property="fb:app_id" content="${process.env.FB_APP_ID}" />`);
    }

    if (videoUrl) {
      metaTags.push(`<meta property="og:video" content="${videoUrl}" />`);
      metaTags.push(`<meta property="og:video:type" content="video/mp4" />`);
      metaTags.push(`<meta property="og:image" content="${optimizedThumb}" />`);
      metaTags.push(`<meta property="og:image:secure_url" content="${optimizedThumb}" />`);
      metaTags.push(`<meta name="twitter:card" content="summary_large_image" />`);
      metaTags.push(`<meta name="twitter:image" content="${optimizedThumb}" />`);
    } else {
      metaTags.push(`<meta property="og:image" content="${optimizedImage}" />`);
      metaTags.push(`<meta property="og:image:secure_url" content="${optimizedImage}" />`);
      metaTags.push(`<meta name="twitter:card" content="summary_large_image" />`);
      metaTags.push(`<meta name="twitter:image" content="${optimizedImage}" />`);
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    const htmlResponse = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    ${metaTags.join('\n    ')}
</head>
<body>
    <script>window.location.href = "${url}";</script>
</body>
</html>`;

    return res.status(200).send(htmlResponse);
  } catch (err) {
    console.error("Error generating preview:", err);
    // Return a generic fallback preview instead of an error
    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${defaultTitle}</title>
    <meta name="description" content="${defaultDesc}" />
    <meta property="og:title" content="${defaultTitle}" />
    <meta property="og:description" content="${defaultDesc}" />
    <meta property="og:image" content="${fallbackImg}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
</head>
<body>
    <script>window.location.href = "${domain}";</script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(fallbackHtml);
  }
}
