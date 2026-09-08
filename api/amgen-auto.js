/**
 * API Route: /api/amgen-auto
 * Proxy & Maintenance Handler for ReyCloudSHP V2
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const apiRes = await fetch('https://api.reycode.my.id/amprem/generate', {
            method: 'GET',
            headers: { 'User-Agent': 'ReyCloudSHP-Dashboard/2.0' },
            signal: AbortSignal.timeout(12000)
        });

        if (!apiRes.ok) {
            throw new Error('Endpoint offline');
        }

        const data = await apiRes.json();

        if (!data || !data.status || !data.result) {
            return res.status(503).json({
                status: false,
                maintenance: true,
                error: 'Maaf V2 sedang melakukan maintenance. mohon pindah ke mode manual saja'
            });
        }

        return res.status(200).json({
            status: true,
            maintenance: false,
            result: data.result
        });

    } catch (err) {
        return res.status(503).json({
            status: false,
            maintenance: true,
            error: 'Maaf V2 sedang melakukan maintenance. mohon pindah ke mode manual saja'
        });
    }
}
