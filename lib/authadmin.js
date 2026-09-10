const CREATOR = 'ReyCode';

// Middleware atau Fungsi Helper untuk Proteksi Admin
module.exports = function verifyAdmin(req, res) {
    const body = req.method === 'GET' ? req.query : (req.body || {});
    
    // Ambil token dari Header (x-admin-token) atau dari query/body request (admintoken)
    const adminToken = req.headers['x-admin-token'] || body.admintoken;
    const ADMIN_SECRET = process.env.ADMIN_GENERATOR_PASSWORD || '';

    if (!adminToken || adminToken !== ADMIN_SECRET) {
        return {
            authorized: false,
            response: {
                status: false,
                creator: CREATOR,
                error: 'Akses ditolak! Token atau password admin tidak valid.'
            }
        };
    }

    return {
        authorized: true
    };
};
