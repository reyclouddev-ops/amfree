/**
 * API Route: /api/img2img
 * AI Image to Image (Img2Img) via FGSI & Uguu Uploader
 */

const axios = require('axios');
const FormData = require('form-data');

const FCSI_API = "https://fgsi.dpdns.org/api/ai/image/img2img";

async function Uguu(buffer, filename) {
  const form = new FormData();
  form.append("files[]", buffer, { filename, contentType: "image/png" });

  const res = await axios.post("https://uguu.se/upload.php", form, {
    headers: form.getHeaders(),
    timeout: 30000,
  });

  if (res.data?.files?.[0]?.url) {
    return res.data.files[0].url;
  }

  throw new Error("Upload ke Uguu gagal");
}

async function Img2Img(prompt, imageBuffer, filename = "upload.png") {
  try {
    const imageUrl = await Uguu(imageBuffer, filename);

    const apiKey = "fgsiapi-acd5b96-6d";
    const startUrl = `${FCSI_API}?apikey=${apiKey}&prompt=${encodeURIComponent(prompt)}&url=${encodeURIComponent(imageUrl)}`;

    const start = await axios.get(startUrl, { timeout: 30000 });

    const pollUrl = start.data?.data?.pollUrl;
    if (!pollUrl) {
      return {
        status: false,
        error: start.data?.error || "Gagal memulai proses img2img",
      };
    }

    let result = null;
    const maxAttempts = 60;

    for (let i = 0; i < maxAttempts; i++) {
      const poll = await axios.get(pollUrl, { timeout: 30000 });

      if (!poll.data?.status) {
        return { status: false, error: "Polling gagal" };
      }

      if (poll.data.data?.status === "Success") {
        result = poll.data.data.result;
        break;
      }

      if (poll.data.data?.status === "Failed") {
        return { status: false, error: "Proses img2img gagal" };
      }

      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!result) {
      return { status: false, error: "Timeout menunggu hasil" };
    }

    return { status: true, prompt, imageUrl, result };
  } catch (e) {
    return { status: false, error: e.message };
  }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ status: false, error: 'Method not allowed' });
    }

    try {
        const { prompt, base64Image, filename } = req.body || {};

        if (!prompt || !base64Image) {
            return res.status(400).json({ status: false, error: 'Prompt dan base64Image wajib disertakan!' });
        }

        let imageBuffer = base64Image;
        if (typeof base64Image === 'string' && base64Image.startsWith('data:image')) {
            const base64Data = base64Image.split(';base64,').pop();
            imageBuffer = Buffer.from(base64Data, 'base64');
        }

        const resData = await Img2Img(prompt, imageBuffer, filename || 'upload.png');
        return res.status(200).json(resData);

    } catch (err) {
        return res.status(500).json({ status: false, error: err.message });
    }
}
