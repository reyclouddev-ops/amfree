/**
 * API Route: /api/amgen-auto
 * Handler untuk Automated AlwaysCodex Scraper v2 (Task-based)
 */

const AlwaysCodexScraper = require('../lib/AlwaysCodexScraper');

// Instance global scraper supaya task tersimpan di memory instance serverless
const scraper = new AlwaysCodexScraper();

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action, taskId } = req.method === 'POST' ? (req.body || {}) : (req.query || {});

        // 1. Aksi untuk Mulai Proses Generate Akun Otomatis
        if (req.method === 'POST' && action === 'start-task') {
            const task = scraper.createTask();
            return res.status(200).json({
                status: true,
                message: 'Task otomatisasi berhasil dibuat. Proses sedang berjalan di latar belakang.',
                taskId: task.taskId
            });
        }

        // 2. Aksi untuk Cek Status Task / Hasilnya
        if (req.method === 'GET' || req.method === 'POST') {
            if (!taskId) {
                return res.status(400).json({ status: false, error: 'Parameter taskId wajib disertakan.' });
            }

            const check = scraper.checkTask(taskId);
            return res.status(200).json(check);
        }

        return res.status(400).json({ status: false, error: 'Aksi atau method tidak valid.' });

    } catch (err) {
        return res.status(500).json({ status: false, error: 'Terjadi kesalahan sistem: ' + err.message });
    }
}
