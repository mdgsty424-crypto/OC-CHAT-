import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL missing" });

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      },
      timeout: 8000,
      validateStatus: () => true
    });

    if (response.status === 429) {
      return res.status(429).json({ error: "Too many requests" });
    }

    if (response.status >= 400) {
      return res.json({
        title: url,
        description: "Preview not available",
        image: "",
        siteName: new URL(url).hostname,
        url
      });
    }

    const html = response.data;
    const $ = cheerio.load(html);

    const getMeta = (name) => 
      $(`meta[property="${name}"]`).attr('content') || 
      $(`meta[name="${name}"]`).attr('content');

    const result = {
      title: getMeta('og:title') || $('title').text() || url,
      description: getMeta('og:description') || getMeta('description') || "No description available",
      image: getMeta('og:image') || "",
      siteName: getMeta('og:site_name') || new URL(url).hostname,
      url
    };

    return res.json(result);
  } catch (error) {
    console.error("Preview fetch error:", error);
    return res.json({
      title: url,
      description: "Failed to fetch preview",
      image: "",
      siteName: new URL(url).hostname,
      url
    });
  }
}
