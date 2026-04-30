export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { targetUserId, title, message, image, largeIcon, link, priority, data, actions } = req.body;

  try {
    const appId = process.env.ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID;
    let apiKey = (process.env.ONESIGNAL_REST_API_KEY || "").trim();

    if (!appId || !apiKey) {
      return res.status(500).json({ error: 'OneSignal configuration missing' });
    }

    // Clean up key
    if (apiKey.toLowerCase().startsWith('key ')) {
      apiKey = apiKey.substring(4).trim();
    } else if (apiKey.toLowerCase().startsWith('basic ')) {
      apiKey = apiKey.substring(6).trim();
    }

    const payload = {
      app_id: appId,
      contents: { en: message },
      headings: { en: title },
      priority: priority === 'high' ? 10 : 5,
      data: { ...data, link },
      web_url: link,
      big_picture: image,
      large_icon: largeIcon,
      chrome_web_icon: largeIcon,
      buttons: actions
    };

    if (targetUserId === 'all') {
      payload.included_segments = ['All'];
    } else {
      payload.include_external_user_ids = [targetUserId];
    }

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    return res.status(response.status).json(result);
  } catch (error) {
    console.error("OneSignal Vercel Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
