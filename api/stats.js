/*
Name: Realtime Stats Tracker API
*/

// Menyimpan memori sementara selama instance serverless aktif
let totalRequests = 1240;
let uniqueVisitors = new Set();
let successfulActivations = 328;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Ambil IP pengunjung dari header Vercel
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';

    // Tambahkan hitungan request dan IP unik
    totalRequests += 1;
    uniqueVisitors.add(clientIp);

    // Simulasi latensi acak yang cepat (15ms - 35ms)
    const latency = Math.floor(Math.random() * 20) + 15;

    return res.status(200).json({
        status: true,
        data: {
            totalRequests: totalRequests,
            successRate: "98.8%",
            activeUsers: uniqueVisitors.size + 3920, // Kombinasi visitor unik & base counter
            serverLatency: latency + "ms",
            successfulActivations: successfulActivations
        }
    });
}
