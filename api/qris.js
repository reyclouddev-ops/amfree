const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const CREATOR = 'ReyCode';

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const amount = "5000";
    const imagePath = path.join(__dirname, '../lib/qris.png');

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ 
        status: false, 
        creator: CREATOR, 
        error: "File qris.png tidak ditemukan di dalam folder lib!" 
      });
    }

    const form = new FormData();
    form.append('amount', amount);
    form.append('image', fs.createReadStream(imagePath));

    const response = await axios.post('https://api.theresav.eu/api/tools/qris', form, {
      headers: {
        ...form.getHeaders(),
        'x-apikey': 'DNcBJ'
      }
    });

    return res.status(200).json(response.data);

  } catch (err) {
    const errorMsg = err.response?.data ? (typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : err.response.data) : err.message;
    return res.status(500).json({ 
      status: false, 
      creator: CREATOR, 
      error: errorMsg 
    });
  }
};
