/**
 * API Route: /api/imagen
 * AI Image Generator Endpoint using Cloudflare Flux AI & ImgBB Uploader
 * Secured with Environment Variables
 */

const fetch = require('node-fetch');

class ImagenScraper {
    constructor() {
        // Menggunakan Environment Variables agar aman di GitHub
        this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
        this.imgbbKey = process.env.IMGBB_API_KEY;

        this.STYLES = {
            "No Style": {
                prompt: "{prompt}",
                negative: "extra hand , extra legs , ugly , glitch , bad eyes, low quality face, text, glitch, deformed, mutated, ugly, disfigured",
                isPro: false
            },
            "Realistic": {
                prompt: "realistic photo {prompt}. highly detailed, high budget, highly details , epic , high quality",
                negative: "anime, cartoon, graphic, text, painting, crayon, graphite, abstract, glitch, deformed, mutated, ugly, disfigured",
                isPro: false
            },
            "Anime": {
                prompt: "High-quality anime style {prompt}, vibrant colors, detailed characters with expressive eyes, dynamic poses, soft lighting, cinematic composition, intricate background, full body, anime aesthetics",
                negative: "blurry, pixelated, low detail, distorted anatomy, over-realistic textures, dull or flat colors, messy lines, poorly drawn hands or faces",
                isPro: false
            },
            "Digital Art": {
                prompt: "digital art {prompt}, artstation trending, concept art, ultra detailed, smooth shading, cinematic lighting, vibrant colors, professional illustration, masterpiece",
                negative: "photo, photorealistic, realism, ugly",
                isPro: false
            },
            "Cyberpunk": {
                prompt: "cyberpunk style {prompt}. extremely detailed, photorealistic, 8k, realistic, neon ambiance, vibrant, high-energy, cyber, futuristic",
                negative: "anime, cartoon, graphic, text, painting, crayon, graphite, abstract, glitch, deformed, mutated, ugly, disfigured",
                isPro: true
            },
            "Cinematic": {
                prompt: "cinematic still {prompt} . emotional, harmonious, vignette, highly detailed, high budget, bokeh, cinemascope, moody, epic, gorgeous, film grain, grainy",
                negative: "anime, cartoon, graphic, text, painting, crayon, graphite, abstract, glitch, deformed, mutated, ugly, disfigured",
                isPro: true
            }
        };

        this.DEFAULT_RATIOS = {
            "1:1": [1024, 1024],
            "3:4": [864, 1152],
            "4:3": [1152, 864],
            "16:9": [1344, 768],
            "9:16": [768, 1344]
        };
    }

    calculateCustomRatio(ratioStr) {
        const parts = ratioStr.split(':');
        if (parts.length !== 2) return [1024, 1024];
        const wRatio = parseFloat(parts[0]);
        const hRatio = parseFloat(parts[1]);
        if (isNaN(wRatio) || isNaN(hRatio) || wRatio <= 0 || hRatio <= 0) return [1024, 1024];
        const targetPixels = 1048576;
        const h = Math.sqrt((targetPixels * hRatio) / wRatio);
        const w = h * (wRatio / hRatio);
        return [Math.round(w / 16) * 16, Math.round(h / 16) * 16];
    }

    async generateImage(options = {}) {
        if (!this.accountId || !this.apiToken) {
            throw new Error("Konfigurasi Cloudflare Account ID atau API Token belum diatur di Environment Variables Vercel!");
        }

        const { prompt, style = "Realistic", ratio = "1:1", steps = 4, upload = true } = options;
        if (!prompt) throw new Error("Prompt wajib diisi!");

        const styleObj = this.STYLES[style] || this.STYLES["Realistic"];
        let width = 1024, height = 1024;

        if (this.DEFAULT_RATIOS[ratio]) {
            [width, height] = this.DEFAULT_RATIOS[ratio];
        } else if (ratio.includes(':')) {
            [width, height] = this.calculateCustomRatio(ratio);
        }

        const finalPrompt = styleObj.prompt.replace("{prompt}", prompt);
        const globalNegative = ", nude,nudity,naked,sfw,nsfw,sex,erotic,pornography,explicit,genital,vagina,penis,nipples,boobs,porn,tits";
        const finalNegative = styleObj.negative + globalNegative;

        const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
        const seed = Math.floor(Math.random() * 2147483647);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: finalPrompt,
                negative_prompt: finalNegative,
                width,
                height,
                steps: parseInt(steps) || 4,
                seed
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Cloudflare API Error (${response.status}): ${errorText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        let buffer;

        if (contentType.includes('application/json')) {
            const json = await response.json();
            if (json.success && json.result && json.result.image) {
                buffer = Buffer.from(json.result.image, 'base64');
            } else {
                throw new Error("Gagal mengambil gambar dari respons Cloudflare JSON.");
            }
        } else {
            buffer = Buffer.from(await response.arrayBuffer());
        }

        let uploadResult = null;
        if (upload && this.imgbbKey) {
            const base64Image = buffer.toString('base64');
            const params = new URLSearchParams();
            params.append('image', base64Image);

            const uploadResponse = await fetch(`https://api.imgbb.com/1/upload?key=${this.imgbbKey}`, {
                method: 'POST',
                body: params
            });

            const uploadJson = await uploadResponse.json();
            if (uploadJson.success) {
                uploadResult = {
                    url: uploadJson.data.url,
                    displayUrl: uploadJson.data.display_url,
                    deleteUrl: uploadJson.data.delete_url
                };
            }
        }

        return {
            buffer,
            url: uploadResult ? uploadResult.url : `data:image/jpeg;base64,${buffer.toString('base64')}`,
            prompt: finalPrompt,
            style,
            ratio,
            seed
        };
    }
}

const imagen = new ImagenScraper();

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const prompt = req.query.prompt || req.body?.prompt;
        const style = req.query.style || req.body?.style || 'Realistic';
        const ratio = req.query.ratio || req.body?.ratio || '1:1';

        if (!prompt) {
            return res.status(400).json({ status: false, error: 'Parameter prompt wajib diisi!' });
        }

        const result = await imagen.generateImage({ prompt, style, ratio, upload: true });

        return res.status(200).json({
            status: true,
            creator: "ReyCode",
            result: result.url,
            details: {
                prompt: result.prompt,
                style: result.style,
                ratio: result.ratio,
                seed: result.seed
            }
        });

    } catch (err) {
        return res.status(500).json({ status: false, error: err.message });
    }
};
